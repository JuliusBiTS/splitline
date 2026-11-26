import { describe, expect, it } from "vitest";
import { PRESETS } from "@/content/presets";
import { IntakeInputSchema } from "@/engine/types";
import {
  blankRow,
  buildDecomposition,
  confirmProblems,
  derivedReversibility,
  draftToRawIntake,
  editedFields,
  EMPTY_DRAFT,
  floorApplies,
  isHighlighted,
  parseIntake,
  restoreDraft,
  rowsFromProposal,
  untickedSuggestions,
  validateStep1,
  validateStep2,
  type IntakeDraft,
  type Step3State,
} from "./intake-state";

const preset = PRESETS.find((p) => p.slug === "claims-document-intake")!;

/** A draft filled the way a user would fill the form for the claims preset. */
function draftFromPreset(): IntakeDraft {
  const i = preset.intake;
  return {
    ...EMPTY_DRAFT,
    title: i.title,
    processDescription: i.processDescription,
    orgType: i.orgType,
    sector: i.sector,
    businessFunction: i.businessFunction,
    aiDecisionRole: i.aiDecisionRole,
    affectedPeople: [...i.affectedPeople],
    dataCategories: [...i.dataCategories],
    jurisdictions: [...i.jurisdictions],
    hosting: i.hosting,
    aiType: i.aiType,
    useCasePatterns: [...i.useCasePatterns],
    customerFacingOutput: i.customerFacingOutput,
    monitorsEmployees: i.monitorsEmployees,
    teamSetup: i.teamSetup,
    readiness: i.readiness,
    mitigations: [...i.mitigations],
    proposedKpis: (i.proposedKpis ?? []).join("\n"),
    genAiToolType: i.genAiToolType ?? "",
  };
}

const step3 = (over: Partial<Step3State> = {}): Step3State => ({
  rows: rowsFromProposal(preset.decomposition, []),
  assumptions: [],
  clarifyingQuestions: [],
  suggestedUseCasePatterns: [],
  confirmedNoConsequential: false,
  ...over,
});

describe("intake draft", () => {
  it("asks for title and description in step 1 with plain messages", () => {
    const e = validateStep1(EMPTY_DRAFT);
    expect(Object.keys(e).sort()).toEqual(["processDescription", "title"]);
    expect(validateStep1({ ...EMPTY_DRAFT, title: "x", processDescription: "a".repeat(199) }).processDescription).toMatch(/200/);
    expect(validateStep1({ ...EMPTY_DRAFT, title: "x", processDescription: "a".repeat(200) })).toEqual({});
  });

  it("reports every unanswered essential question in step 2 and nothing from step 1", () => {
    const e = validateStep2({ ...EMPTY_DRAFT, title: "", processDescription: "" });
    expect(Object.keys(e).sort()).toEqual(
      ["affectedPeople", "aiDecisionRole", "aiType", "businessFunction", "dataCategories", "hosting", "jurisdictions", "orgType", "sector"].sort(),
    );
  });

  it("produces a valid intake without guessing optional fields", () => {
    const intake = parseIntake(draftFromPreset());
    expect(intake).not.toBeNull();
    expect(intake!.dynamism).toBeUndefined();
    expect(intake!.reversibilityOverride).toBeUndefined();
    expect(intake!.employerSize25Plus).toBeUndefined();
    expect(IntakeInputSchema.parse(preset.intake).useCasePatterns).toEqual(intake!.useCasePatterns);
  });

  it("drops the gen-AI tool type unless the AI is generative", () => {
    const raw = draftToRawIntake({ ...draftFromPreset(), aiType: "classical_ml", genAiToolType: "public_tool" });
    expect(raw).not.toHaveProperty("genAiToolType");
  });

  it("derives the reversibility default from the role, patterns and appeal path", () => {
    expect(derivedReversibility(EMPTY_DRAFT)).toBeNull();
    expect(derivedReversibility({ ...EMPTY_DRAFT, aiDecisionRole: "recommends" })).toBe("short_term");
    expect(derivedReversibility({ ...EMPTY_DRAFT, aiDecisionRole: "recommends", useCasePatterns: ["claims_eligibility"] })).toBe("hard_to_reverse");
  });

  it("restores a stored draft field by field and ignores junk", () => {
    expect(restoreDraft(null)).toEqual(EMPTY_DRAFT);
    const r = restoreDraft({ title: "Kept", affectedPeople: ["patients", 3], readiness: 7, extra: "x" });
    expect(r.title).toBe("Kept");
    expect(r.affectedPeople).toEqual([]);
    expect(r.readiness).toBe(EMPTY_DRAFT.readiness);
    expect(r).not.toHaveProperty("extra");
  });
});

describe("confirm split", () => {
  const intake = parseIntake(draftFromPreset())!;

  it("renumbers IDs, strips source quotes and keeps the user's edits", () => {
    const rows = rowsFromProposal(preset.decomposition, [{ subtaskId: "s1", sourceQuote: "a quote from the description" }]);
    expect(rows[0]!.sourceQuote).toBe("a quote from the description");
    const kept = rows.slice(1);
    const d = buildDecomposition(step3({ rows: kept }));
    expect(d.subtasks.map((s) => s.id)).toEqual(kept.map((_, i) => `s${i + 1}`));
    expect(JSON.stringify(d)).not.toContain("a quote from the description");
  });

  it("blocks confirm on the consequential floor until a step is marked or none is confirmed", () => {
    expect(floorApplies(intake)).toBe(true);
    const unmarked = step3().rows.map((r) => ({ ...r, consequential: false }));
    expect(confirmProblems(intake, step3({ rows: unmarked })).map((p) => p.kind)).toContain("floor");
    expect(confirmProblems(intake, step3({ rows: unmarked, confirmedNoConsequential: true }))).toEqual([]);
    expect(buildDecomposition(step3({ rows: unmarked, confirmedNoConsequential: true })).confirmedNoConsequential).toBe(true);
    // A marked step makes a stale confirmation meaningless, so it is dropped.
    expect(buildDecomposition(step3({ confirmedNoConsequential: true })).confirmedNoConsequential).toBeUndefined();
  });

  it("does not apply the floor when the AI only informs or only businesses are affected", () => {
    expect(floorApplies({ aiDecisionRole: "informs", affectedPeople: ["patients"] })).toBe(false);
    expect(floorApplies({ aiDecisionRole: "recommends", affectedPeople: ["businesses_only"] })).toBe(false);
  });

  it("needs 3–8 named steps", () => {
    const rows = [blankRow("a"), blankRow("b")];
    const kinds = confirmProblems(intake, step3({ rows })).map((p) => p.kind);
    expect(kinds).toContain("count");
    expect(kinds).toContain("names");
  });

  it("highlights consequential and costly rows, marks edits and leaves ticked suggestions alone", () => {
    expect(isHighlighted({ consequential: false, errorCost: "high" })).toBe(true);
    expect(isHighlighted({ consequential: false, errorCost: "medium" })).toBe(false);
    const row = { ...step3().rows[0]!, volume: "low" as const };
    expect(editedFields(row, preset.decomposition)).toEqual(preset.decomposition.subtasks[0]!.volume === "low" ? [] : ["volume"]);
    expect(editedFields(blankRow("new"), preset.decomposition)).toEqual([]);
    expect(untickedSuggestions(["claims_eligibility", "customer_chatbot"], ["claims_eligibility"])).toEqual(["customer_chatbot"]);
  });
});
