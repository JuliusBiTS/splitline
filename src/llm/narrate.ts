/**
 * `/api/narrate` core (SPEC §8): engine facts → narrative. The model writes text only; the guard
 * rejects anything outside the triggered set; a second failure falls back to the template.
 * Never fails: the caller always gets a narrative (LLM or template) plus why.
 */
import { z } from "zod";
import { NarrativeSchema, type Narrative, type NarrativeSource } from "@/engine/types";
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
import { checkNarrative, type GuardViolation } from "./guard";
import { userNamesOf, type NarrationFacts } from "./narration-facts";
import { templateNarrative } from "./narrate-template";
import { loadPrompt, sanitizeUserText } from "./prompts";

/** Loose schema for `zodOutputFormat()`; `NarrativeSchema` (lengths, exactly three levers) is checked locally. */
export const LlmNarrativeSchema = z.object({
  executiveSummary: z.string(),
  splitNarrative: z.string(),
  leverNarratives: z.array(z.string()),
  rolloutNarrative: z.string(),
});

export function buildNarrateUserMessage(facts: NarrationFacts, previousProblems: readonly string[] = []): string {
  const safe: NarrationFacts = {
    ...facts,
    caseTitle: sanitizeUserText(facts.caseTitle),
    split: facts.split.map((s) => ({ ...s, step: sanitizeUserText(s.step) })),
  };
  const parts = [`<engine_facts>\n${JSON.stringify(safe, null, 2)}\n</engine_facts>`];
  if (previousProblems.length > 0) {
    parts.push(`<previous_attempt_problems>\n${previousProblems.map((p) => `- ${p}`).join("\n")}\n</previous_attempt_problems>`);
  }
  return parts.join("\n\n");
}

export function describeViolation(v: GuardViolation): string {
  switch (v.kind) {
    case "untriggered_statute":
      return `${v.field}: names "${v.match}", which is not a source in the facts. Remove it.`;
    case "untriggered_rule_id":
    case "rule_id":
      return `${v.field}: contains the code "${v.match}". Use the source name instead of codes.`;
    case "subtask_id":
      return `${v.field}: contains the step ID "${v.match}". Use the step name.`;
    case "banned_phrase":
      return `${v.field}: uses "${v.match}", which reads as a legal conclusion. Rephrase with "likely triggers" or "consider".`;
    case "proposed_as_binding":
      return `${v.field}: names "${v.match}" without saying in the same sentence that it is proposed.`;
  }
}

export interface NarrateDeps {
  client?: LlmClient;
  sleep?: Sleep;
}

export interface NarrateResult {
  narrative: Narrative;
  source: NarrativeSource;
  attempts: number;
  usage: LlmUsage[];
  /** Guard violations per attempt (empty array = that attempt passed). */
  violations: GuardViolation[][];
  /** Why the template was used, when it was. */
  failure?: LlmFailure;
}

export const MAX_NARRATE_ATTEMPTS = 2;

export async function narrate(
  facts: NarrationFacts,
  triggeredRuleIds: readonly string[],
  deps: NarrateDeps = {},
): Promise<NarrateResult> {
  const client = deps.client ?? getClient();
  const sleep = deps.sleep ?? realSleep;
  const usage: LlmUsage[] = [];
  const violations: GuardViolation[][] = [];
  let problems: string[] = [];
  let failure: LlmFailure = { kind: "schema" };

  for (let attempt = 1; attempt <= MAX_NARRATE_ATTEMPTS; attempt++) {
    try {
      const res = await withTransportRetry(
        () =>
          parseStructured(client, {
            system: [loadPrompt("narrate")],
            user: buildNarrateUserMessage(facts, problems),
            schema: LlmNarrativeSchema,
            effort: "low",
            maxTokens: 4_000,
          }),
        sleep,
      );
      usage.push(res.usage);
      const parsed = NarrativeSchema.safeParse(res.output);
      if (!parsed.success) {
        problems = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
        failure = { kind: "schema", detail: "local_validation" };
        violations.push([]);
        continue;
      }
      const found = checkNarrative(parsed.data, triggeredRuleIds, { userNames: userNamesOf(facts) });
      violations.push(found);
      if (found.length === 0) return { narrative: parsed.data, source: "llm", attempts: attempt, usage, violations };
      problems = found.map(describeViolation);
      failure = { kind: "guard", detail: [...new Set(found.map((v) => v.kind))].join(",") };
    } catch (err) {
      const f = err instanceof LlmCallError ? err.failure : { kind: "schema" as const, detail: "unknown" };
      if (f.kind !== "schema" && f.kind !== "refusal") {
        return { narrative: templateNarrative(facts), source: "template", attempts: attempt, usage, violations, failure: f };
      }
      failure = f;
    }
  }
  return { narrative: templateNarrative(facts), source: "template", attempts: MAX_NARRATE_ATTEMPTS, usage, violations, failure };
}
