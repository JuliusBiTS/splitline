/**
 * Intake state for `/case/new` (SPEC §5–6). Pure: no React, no storage, no network, so it is
 * unit-tested directly. Rule-relevant facts come only from fields the user sets (ADR-0006).
 */
import { z } from "zod";
import { consequentialFloorBlocks, deriveReversibility } from "@/engine/facts";
import {
  ConfirmedDecompositionSchema,
  DecompositionSchema,
  IntakeInputSchema,
  type ConfirmedDecomposition,
  type Decomposition,
  type IntakeInput,
  type Subtask,
  type UseCasePattern,
} from "@/engine/types";

// ---------------------------------------------------------------------------
// Steps 1–2: the intake draft
// ---------------------------------------------------------------------------

/** Every field as the form holds it. Selects start empty ("") so nothing is pre-chosen for the user. */
export interface IntakeDraft {
  title: string;
  processDescription: string;
  orgType: string;
  sector: string;
  businessFunction: string;
  aiDecisionRole: string;
  affectedPeople: string[];
  dataCategories: string[];
  jurisdictions: string[];
  hosting: string;
  aiType: string;
  useCasePatterns: string[];
  // More context (advanced)
  customerFacingOutput: boolean;
  monitorsEmployees: boolean;
  teamSetup: string;
  readiness: string;
  dynamism: string; // "" = derived from the AI type
  crisisContext: boolean;
  employerSize25Plus: "" | "yes" | "no";
  proposedKpis: string; // one per line
  mitigations: string[];
  reversibilityOverride: string; // "" = derived default
  genAiToolType: string;
}

/**
 * Advanced fields the engine needs a value for start at visible defaults, listed under
 * "More context" (ADR-0020). Booleans start unticked, as SPEC §5 asks for mitigations.
 */
export const ADVANCED_DEFAULTS = { teamSetup: "separate_ai_team", readiness: "medium" } as const;

export const EMPTY_DRAFT: IntakeDraft = {
  title: "",
  processDescription: "",
  orgType: "",
  sector: "",
  businessFunction: "",
  aiDecisionRole: "",
  affectedPeople: [],
  dataCategories: [],
  jurisdictions: [],
  hosting: "",
  aiType: "",
  useCasePatterns: [],
  customerFacingOutput: false,
  monitorsEmployees: false,
  teamSetup: ADVANCED_DEFAULTS.teamSetup,
  readiness: ADVANCED_DEFAULTS.readiness,
  dynamism: "",
  crisisContext: false,
  employerSize25Plus: "",
  proposedKpis: "",
  mitigations: [],
  reversibilityOverride: "",
  genAiToolType: "",
};

export const DESCRIPTION_MIN = 200;
export const DESCRIPTION_MAX = 2000;
export const TITLE_MAX = 80;

const STEP1_FIELDS = ["title", "processDescription"] as const;
export const STEP2_FIELDS = [
  "orgType",
  "sector",
  "businessFunction",
  "aiDecisionRole",
  "affectedPeople",
  "dataCategories",
  "jurisdictions",
  "hosting",
  "aiType",
] as const;

export type FieldErrors = Partial<Record<keyof IntakeDraft, string>>;

const MESSAGES: Partial<Record<keyof IntakeDraft, string>> = {
  title: `Give the use case a short title (up to ${TITLE_MAX} characters).`,
  processDescription: `Describe the current process and the intended AI use in ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters.`,
  orgType: "Choose the type of organization.",
  sector: "Choose a sector.",
  businessFunction: "Choose the business function.",
  aiDecisionRole: "Choose what the AI does in the decision.",
  affectedPeople: "Tick at least one group of affected people.",
  dataCategories: "Tick at least one kind of data.",
  jurisdictions: "Tick at least one place where affected people live.",
  hosting: "Choose where the AI processes and stores data.",
  aiType: "Choose the type of AI.",
};

/** Turns the draft into a raw intake. Empty optional fields are left out, never guessed. */
export function draftToRawIntake(d: IntakeDraft): Record<string, unknown> {
  const kpis = d.proposedKpis
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);
  return {
    title: d.title.trim(),
    processDescription: d.processDescription.trim(),
    orgType: d.orgType || undefined,
    sector: d.sector || undefined,
    businessFunction: d.businessFunction || undefined,
    aiDecisionRole: d.aiDecisionRole || undefined,
    affectedPeople: d.affectedPeople,
    dataCategories: d.dataCategories,
    jurisdictions: d.jurisdictions,
    hosting: d.hosting || undefined,
    aiType: d.aiType || undefined,
    useCasePatterns: d.useCasePatterns,
    customerFacingOutput: d.customerFacingOutput,
    monitorsEmployees: d.monitorsEmployees,
    teamSetup: d.teamSetup,
    readiness: d.readiness,
    ...(d.dynamism ? { dynamism: d.dynamism } : {}),
    ...(d.crisisContext ? { crisisContext: true } : {}),
    ...(d.employerSize25Plus ? { employerSize25Plus: d.employerSize25Plus === "yes" } : {}),
    ...(kpis.length > 0 ? { proposedKpis: kpis } : {}),
    mitigations: d.mitigations,
    ...(d.reversibilityOverride ? { reversibilityOverride: d.reversibilityOverride } : {}),
    ...(d.aiType === "generative_llm" && d.genAiToolType ? { genAiToolType: d.genAiToolType } : {}),
  };
}

function errorsFor(d: IntakeDraft, fields: readonly (keyof IntakeDraft)[]): FieldErrors {
  const parsed = IntakeInputSchema.safeParse(draftToRawIntake(d));
  if (parsed.success) return {};
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || !(fields as readonly string[]).includes(key)) continue;
    const k = key as keyof IntakeDraft;
    errors[k] ??= MESSAGES[k] ?? "Check this field.";
  }
  return errors;
}

export const validateStep1 = (d: IntakeDraft) => errorsFor(d, STEP1_FIELDS);
export function validateStep2(d: IntakeDraft): FieldErrors {
  return errorsFor(d, [...STEP2_FIELDS, "proposedKpis", "useCasePatterns", "mitigations"]);
}

export function parseIntake(d: IntakeDraft): IntakeInput | null {
  const parsed = IntakeInputSchema.safeParse(draftToRawIntake(d));
  return parsed.success ? parsed.data : null;
}

/** The reversibility the engine would derive from the current draft (shown as the pre-filled default). */
export function derivedReversibility(d: IntakeDraft) {
  const role = IntakeInputSchema.shape.aiDecisionRole.safeParse(d.aiDecisionRole);
  if (!role.success) return null;
  return deriveReversibility(role.data, d.useCasePatterns as UseCasePattern[], d.mitigations.includes("appeal_path"));
}

/** Draft from storage: anything unexpected falls back to the empty draft field by field. */
export function restoreDraft(stored: unknown): IntakeDraft {
  if (!stored || typeof stored !== "object") return EMPTY_DRAFT;
  const s = stored as Record<string, unknown>;
  const out: Record<string, unknown> = { ...EMPTY_DRAFT };
  for (const [k, v] of Object.entries(EMPTY_DRAFT)) {
    const sv = s[k];
    if (Array.isArray(v) ? Array.isArray(sv) && sv.every((x) => typeof x === "string") : typeof sv === typeof v) out[k] = sv;
  }
  return out as unknown as IntakeDraft;
}

// ---------------------------------------------------------------------------
// Step 3: the editable subtask table
// ---------------------------------------------------------------------------

export const MIN_SUBTASKS = 3;
export const MAX_SUBTASKS = 8;

/** A table row. `key` is stable across edits; IDs are renumbered s1…sN on confirm. */
export interface SubtaskRow extends Omit<Subtask, "id"> {
  key: string;
  /** Verbatim quote from the description the AI based this step on (never stored in the case). */
  sourceQuote?: string;
  /** The AI proposal for this row, so edits can be marked; absent for rows the user added. */
  proposedId?: string;
}

export function blankRow(key: string): SubtaskRow {
  return {
    key,
    name: "",
    description: "",
    judgmentIntensity: "medium",
    knowledgeType: "codifiable",
    errorCost: "medium",
    volume: "medium",
    affectsIndividuals: false,
    consequential: false,
    rationale: "",
  };
}

export function rowsFromProposal(d: Decomposition, grounding: readonly { subtaskId: string; sourceQuote: string }[]): SubtaskRow[] {
  return d.subtasks.map(({ id, ...rest }) => ({
    ...rest,
    key: id,
    proposedId: id,
    sourceQuote: grounding.find((g) => g.subtaskId === id)?.sourceQuote,
  }));
}

export interface Step3State {
  rows: SubtaskRow[];
  assumptions: string[];
  clarifyingQuestions: string[];
  suggestedUseCasePatterns: UseCasePattern[];
  confirmedNoConsequential: boolean;
}

export function buildDecomposition(s: Step3State): ConfirmedDecomposition {
  return ConfirmedDecompositionSchema.parse({
    // Source quotes never enter the confirmed decomposition, so they never reach a share link (ADR-0019 §3).
    subtasks: s.rows.map((r, i) => ({
      id: `s${i + 1}`,
      name: r.name.trim(),
      description: r.description,
      judgmentIntensity: r.judgmentIntensity,
      knowledgeType: r.knowledgeType,
      errorCost: r.errorCost,
      volume: r.volume,
      affectsIndividuals: r.affectsIndividuals,
      consequential: r.consequential,
      rationale: r.rationale,
    })),
    assumptions: s.assumptions,
    clarifyingQuestions: s.clarifyingQuestions,
    suggestedUseCasePatterns: s.suggestedUseCasePatterns,
    // The explicit "no step bears on a decision" confirmation only means something when no row is marked.
    ...(s.confirmedNoConsequential && !s.rows.some((r) => r.consequential) ? { confirmedNoConsequential: true } : {}),
  });
}

export type ConfirmProblem =
  | { kind: "count"; message: string }
  | { kind: "names"; message: string; rowKeys: string[] }
  | { kind: "floor"; message: string };

export const FLOOR_MESSAGE =
  "The AI does more than inform and the result affects people, but no step is marked as bearing on a decision about a person. Mark that step, or confirm that none does.";

/** Why "Confirm split" is blocked, if it is (SPEC §6, ADR-0006). */
export function confirmProblems(intake: Pick<IntakeInput, "aiDecisionRole" | "affectedPeople">, s: Step3State): ConfirmProblem[] {
  const problems: ConfirmProblem[] = [];
  if (s.rows.length < MIN_SUBTASKS || s.rows.length > MAX_SUBTASKS)
    problems.push({ kind: "count", message: `Keep between ${MIN_SUBTASKS} and ${MAX_SUBTASKS} steps.` });
  const badNames = s.rows.filter((r) => r.name.trim().length === 0 || r.name.length > 60).map((r) => r.key);
  if (badNames.length > 0) problems.push({ kind: "names", message: "Give every step a name (up to 60 characters).", rowKeys: badNames });
  const longText = s.rows.some((r) => r.description.length > 240 || r.rationale.length > 200);
  if (longText) problems.push({ kind: "names", message: "Keep descriptions to 240 and reasons to 200 characters.", rowKeys: [] });
  const floor = consequentialFloorBlocks(intake, {
    subtasks: s.rows.map((r) => ({ ...r, id: "s1" })),
    confirmedNoConsequential: s.confirmedNoConsequential,
  });
  if (floor) problems.push({ kind: "floor", message: FLOOR_MESSAGE });
  return problems;
}

/** Whether the floor question applies at all (so the confirmation checkbox is shown only then). */
export function floorApplies(intake: Pick<IntakeInput, "aiDecisionRole" | "affectedPeople">): boolean {
  return intake.aiDecisionRole !== "informs" && intake.affectedPeople.some((a) => a !== "businesses_only");
}

/** A row is highlighted when it bears on a decision or an error would be costly (SPEC §6). */
export const isHighlighted = (r: Pick<Subtask, "consequential" | "errorCost">) =>
  r.consequential || r.errorCost === "high" || r.errorCost === "critical";

/** Fields of a row that differ from the AI proposal. */
export function editedFields(row: SubtaskRow, proposal: Decomposition | null): string[] {
  const p = proposal?.subtasks.find((s) => s.id === row.proposedId);
  if (!p) return [];
  const keys = ["name", "description", "judgmentIntensity", "knowledgeType", "errorCost", "volume", "affectsIndividuals", "consequential", "rationale"] as const;
  return keys.filter((k) => p[k] !== row[k]);
}

/** Suggested patterns the user has not ticked yet (shown as one-click chips, never applied automatically). */
export function untickedSuggestions(suggested: readonly UseCasePattern[], ticked: readonly string[]): UseCasePattern[] {
  return suggested.filter((p) => !ticked.includes(p));
}

// ---------------------------------------------------------------------------
// API responses (validated: the client never trusts a response shape)
// ---------------------------------------------------------------------------

export const LiveStatusSchema = z.object({ live: z.boolean(), message: z.string().optional() });

export const DecomposeOkSchema = z.object({
  ok: z.literal(true),
  decomposition: DecompositionSchema,
  grounding: z.array(z.object({ subtaskId: z.string(), sourceQuote: z.string() })),
  caseToken: z.string(),
});
export const RefusalSchema = z.object({ ok: z.literal(false), message: z.string(), fallback: z.literal("manual").optional() });
