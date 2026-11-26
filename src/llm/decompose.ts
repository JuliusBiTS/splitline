/**
 * `/api/decompose` core (SPEC §6, §8): free-text process description → proposed subtasks that the
 * user must confirm. The model only proposes; the engine decides everything downstream (ADR-0001).
 *
 * Two schemas: the loose `LlmDecompositionSchema` goes to the model via `zodOutputFormat()` (no
 * min/max/regex the API might not enforce, SPEC §8); the result is then checked locally against the
 * strict `DecompositionSchema` and every `sourceQuote` must appear verbatim in the description.
 */
import { z } from "zod";
import { valueLabel } from "@/engine/labels";
import {
  DecompositionSchema,
  UseCasePatternSchema,
  type Decomposition,
  type IntakeInput,
  type UseCasePattern,
} from "@/engine/types";
import {
  getClient,
  LlmCallError,
  parseStructured,
  realSleep,
  withTransportRetry,
  type LlmClient,
  type LlmFailure,
  type LlmUsage,
  type Sleep,
} from "./client";
import { loadPrompt, sanitizeUserText } from "./prompts";

export const LlmSubtaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  sourceQuote: z.string(),
  judgmentIntensity: z.enum(["low", "medium", "high"]),
  knowledgeType: z.enum(["codifiable", "tacit"]),
  errorCost: z.enum(["low", "medium", "high", "critical"]),
  volume: z.enum(["low", "medium", "high"]),
  affectsIndividuals: z.boolean(),
  consequential: z.boolean(),
  rationale: z.string(),
});

export const LlmDecompositionSchema = z.object({
  subtasks: z.array(LlmSubtaskSchema),
  assumptions: z.array(z.string()),
  clarifyingQuestions: z.array(z.string()),
  suggestedUseCasePatterns: z.array(UseCasePatternSchema),
});
export type LlmDecomposition = z.infer<typeof LlmDecompositionSchema>;

/** The intake fields the decomposition sees. Rule facts never come from here (ADR-0006). */
export type DecomposeInput = Pick<
  IntakeInput,
  | "title"
  | "processDescription"
  | "sector"
  | "businessFunction"
  | "aiDecisionRole"
  | "affectedPeople"
  | "aiType"
  | "useCasePatterns"
>;

/** Where each subtask came from in the description. Shown in step 3; never stored in a share link (ADR-0008). */
export interface SubtaskGrounding {
  subtaskId: string;
  sourceQuote: string;
}

export const MIN_QUOTE_CHARS = 8;

/** Whitespace, case and typographic quotes/dashes are normalized before the verbatim check. */
export function normalizeForQuote(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isGrounded(quote: string, description: string): boolean {
  const q = normalizeForQuote(quote);
  return q.length >= MIN_QUOTE_CHARS && normalizeForQuote(description).includes(q);
}

export type ValidationResult =
  | { ok: true; decomposition: Decomposition; grounding: SubtaskGrounding[] }
  | { ok: false; problems: string[] };

/** Local checks: strict schema (counts, lengths, IDs) plus verbatim grounding of every subtask. */
export function validateDecomposition(
  llm: LlmDecomposition,
  description: string,
  tickedPatterns: readonly UseCasePattern[],
): ValidationResult {
  const problems: string[] = [];
  const subtasks = llm.subtasks.map((s, i) => ({
    id: `s${i + 1}`,
    name: s.name.trim(),
    description: s.description.trim(),
    judgmentIntensity: s.judgmentIntensity,
    knowledgeType: s.knowledgeType,
    errorCost: s.errorCost,
    volume: s.volume,
    affectsIndividuals: s.affectsIndividuals,
    consequential: s.consequential,
    rationale: s.rationale.trim(),
  }));
  llm.subtasks.forEach((s, i) => {
    if (!isGrounded(s.sourceQuote, description)) {
      problems.push(`Subtask ${i + 1} ("${s.name.slice(0, 60)}"): sourceQuote is not copied word for word from the description.`);
    }
  });
  const ticked = new Set(tickedPatterns);
  const candidate = {
    subtasks,
    assumptions: llm.assumptions.map((a) => a.trim()).filter(Boolean),
    clarifyingQuestions: llm.clarifyingQuestions.map((q) => q.trim()).filter(Boolean),
    // Only suggest what the user has not ticked; never applied automatically (ADR-0006).
    suggestedUseCasePatterns: [...new Set(llm.suggestedUseCasePatterns)].filter((p) => !ticked.has(p)),
  };
  const parsed = DecompositionSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) problems.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
  }
  if (problems.length > 0 || !parsed.success) return { ok: false, problems };
  return {
    ok: true,
    decomposition: parsed.data,
    grounding: llm.subtasks.map((s, i) => ({ subtaskId: `s${i + 1}`, sourceQuote: s.sourceQuote.trim() })),
  };
}

const list = (values: readonly string[]) => (values.length ? values.map(valueLabel).join(", ") : "none");

export function buildDecomposeUserMessage(input: DecomposeInput, previousProblems: readonly string[] = []): string {
  const intake = [
    `Title: ${sanitizeUserText(input.title)}`,
    `Sector: ${valueLabel(input.sector)}`,
    `Business function: ${valueLabel(input.businessFunction)}`,
    `Role of the AI in the decision: ${valueLabel(input.aiDecisionRole)}`,
    `Affected people: ${list(input.affectedPeople)}`,
    `Type of AI: ${valueLabel(input.aiType)}`,
    `Use-case patterns already ticked: ${list(input.useCasePatterns)}`,
  ].join("\n");
  const parts = [
    `<intake>\n${intake}\n</intake>`,
    `<process_description>\n${sanitizeUserText(input.processDescription)}\n</process_description>`,
  ];
  if (previousProblems.length > 0) {
    parts.push(`<previous_attempt_problems>\n${previousProblems.map((p) => `- ${p}`).join("\n")}\n</previous_attempt_problems>`);
  }
  return parts.join("\n\n");
}

export interface DecomposeDeps {
  client?: LlmClient;
  sleep?: Sleep;
}

export type DecomposeResult =
  | {
      ok: true;
      decomposition: Decomposition;
      grounding: SubtaskGrounding[];
      attempts: number;
      usage: LlmUsage[];
    }
  | { ok: false; failure: LlmFailure; attempts: number; usage: LlmUsage[]; problems: string[] };

/** At most two model attempts: a schema, grounding or refusal failure gets one retry, then the manual-entry fallback. */
export const MAX_DECOMPOSE_ATTEMPTS = 2;

export async function decompose(input: DecomposeInput, deps: DecomposeDeps = {}): Promise<DecomposeResult> {
  const client = deps.client ?? getClient();
  const sleep = deps.sleep ?? realSleep;
  const description = sanitizeUserText(input.processDescription);
  const usage: LlmUsage[] = [];
  let problems: string[] = [];
  let lastFailure: LlmFailure = { kind: "schema" };

  for (let attempt = 1; attempt <= MAX_DECOMPOSE_ATTEMPTS; attempt++) {
    try {
      const res = await withTransportRetry(
        () =>
          parseStructured(client, {
            system: [loadPrompt("decompose")],
            user: buildDecomposeUserMessage(input, problems),
            schema: LlmDecompositionSchema,
            effort: "medium",
            maxTokens: 8_000,
          }),
        sleep,
      );
      usage.push(res.usage);
      const checked = validateDecomposition(res.output, description, input.useCasePatterns);
      if (checked.ok) return { ok: true, decomposition: checked.decomposition, grounding: checked.grounding, attempts: attempt, usage };
      problems = checked.problems;
      lastFailure = { kind: "schema", detail: "local_validation" };
    } catch (err) {
      const failure = err instanceof LlmCallError ? err.failure : { kind: "schema" as const, detail: "unknown" };
      if (failure.kind !== "schema" && failure.kind !== "refusal") {
        return { ok: false, failure, attempts: attempt, usage, problems };
      }
      lastFailure = failure;
    }
  }
  return { ok: false, failure: lastFailure, attempts: MAX_DECOMPOSE_ATTEMPTS, usage, problems };
}
