import { describe, expect, it } from "vitest";
import { BASE_INTAKE, CONSEQUENTIAL_DECOMPOSITION, PLAIN_DECOMPOSITION } from "../../tests/fixtures/cases";
import { deriveFacts } from "./facts";
import { computeTier, levelFor, TIER_LABEL, TIER_MAX_SCORE, TIER_WEIGHTS } from "./tier";
import { IntakeInputSchema, type IntakeInputRaw } from "./types";

const tierOf = (over: Partial<IntakeInputRaw> = {}, d = PLAIN_DECOMPOSITION) =>
  computeTier(deriveFacts(IntakeInputSchema.parse({ ...BASE_INTAKE, ...over }), d));

describe("tier weights (ADR-0004 final = SPEC §7.2)", () => {
  it("matches the SPEC §7.2 table exactly", () => {
    expect(TIER_WEIGHTS.aiDecisionRole).toEqual({ informs: 1, recommends: 3, decides_with_review: 5, decides_alone: 8 });
    expect(TIER_WEIGHTS.consequential).toEqual({ none: 0, consequential: 4 });
    expect(TIER_WEIGHTS.dataSensitivity).toEqual({
      no_personal: 0,
      customer_pi: 2,
      financial: 3,
      employee_hr: 4,
      health: 5,
      biometric: 5,
      children: 5,
    });
    expect(TIER_WEIGHTS.affectedPeople).toEqual({ businesses_only: 0, public_customers: 2, employees_applicants: 3, patients: 4 });
    expect(TIER_WEIGHTS.reversibility).toEqual({ reversible_brief: 0, short_term: 2, hard_to_reverse: 4, irreversible: 6 });
    expect(TIER_WEIGHTS.scaleMax).toBe(3);
    expect(TIER_WEIGHTS.customerFacingGenerative).toBe(2);
  });
  it("computes the maximum as the sum of the maxima (32)", () => {
    expect(TIER_MAX_SCORE).toBe(32);
  });
});

describe("AIA thresholds (fixed): I ≤ 25 · II ≤ 50 · III ≤ 75 · IV otherwise", () => {
  it.each([
    [0, "I"],
    [8, "I"], // exactly 25 %
    [8.01, "II"],
    [16, "II"], // exactly 50 %
    [16.01, "III"],
    [24, "III"], // exactly 75 %
    [24.01, "IV"],
    [32, "IV"],
  ] as const)("score %s of 32 → %s", (score, level) => {
    expect(levelFor(score, 32)).toBe(level);
  });
  it("is robust to the 0.85 float product at a boundary", () => {
    // 20 × 0.85 = 17 (53.1 %), and 18.8235… × 0.85 ≈ 16 should stay at II, not drift to III
    expect(levelFor(20 * 0.85, 32)).toBe("III");
    expect(levelFor((16 / 0.85) * 0.85, 32)).toBe("II");
  });
});

describe("mitigation deduction (≥ 4 of 5 → −15 %)", () => {
  const heavy: Partial<IntakeInputRaw> = {
    aiDecisionRole: "recommends",
    affectedPeople: ["public_customers"],
    dataCategories: ["health"],
    useCasePatterns: ["claims_eligibility"],
  };
  it("does not apply with 3 mitigations", () => {
    const t = tierOf(
      { ...heavy, mitigations: ["human_final_decision", "predeployment_testing", "monitoring_plan"] },
      CONSEQUENTIAL_DECOMPOSITION,
    );
    expect(t.mitigationDeductionApplied).toBe(false);
    expect(t.score).toBe(t.rawScore);
  });
  it("applies with 4 mitigations", () => {
    const t = tierOf(
      { ...heavy, mitigations: ["human_final_decision", "explanation_available", "predeployment_testing", "monitoring_plan"] },
      CONSEQUENTIAL_DECOMPOSITION,
    );
    expect(t.mitigationDeductionApplied).toBe(true);
    expect(t.score).toBeCloseTo(t.rawScore * 0.85, 10);
  });
});

describe("rationale", () => {
  it("is labelled as an AIA-inspired indicative tier", () => {
    expect(tierOf().label).toBe(TIER_LABEL);
    expect(TIER_LABEL).toBe("AIA-inspired indicative tier");
  });
  it("lists at most 3 top factors, highest points first", () => {
    const t = tierOf(
      { aiDecisionRole: "decides_alone", dataCategories: ["health"], affectedPeople: ["patients"] },
      CONSEQUENTIAL_DECOMPOSITION,
    );
    expect(t.topFactors).toEqual(["aiDecisionRole", "dataSensitivity", "consequential"]);
  });
  it("names the subtask that supplied the consequential points", () => {
    const t = tierOf({ aiDecisionRole: "recommends" }, CONSEQUENTIAL_DECOMPOSITION);
    expect(t.rationale.join(" ")).toContain("Step s2");
    expect(t.rationale.join(" ")).not.toContain("(s2)");
  });
  it("names a reversibility override", () => {
    expect(tierOf({ reversibilityOverride: "hard_to_reverse" }).rationale.join(" ")).toContain(
      "Reversibility set by user: difficult to reverse",
    );
  });
  it("shows the explicit 'no consequential step' confirmation", () => {
    const t = tierOf({}, { ...PLAIN_DECOMPOSITION, confirmedNoConsequential: true });
    expect(t.rationale.join(" ")).toContain("You confirmed that no step bears on a decision about a person");
  });
  it("adds customer-facing points only for generative output", () => {
    const gen = tierOf({ customerFacingOutput: true, aiType: "generative_llm" });
    const ml = tierOf({ customerFacingOutput: true, aiType: "classical_ml" });
    expect(gen.rawScore - ml.rawScore).toBe(2);
  });
});

describe("rationale wording for managers (ADR-0018)", () => {
  it("names the steps that bear on a decision about a person once, without IDs", () => {
    const t = tierOf({ aiDecisionRole: "recommends" }, CONSEQUENTIAL_DECOMPOSITION);
    const text = t.rationale.join(" ");
    expect(text).toContain("Steps that bear on a decision about a person: Step s2");
    expect(text).not.toMatch(/Most consequential subtask|consequential \(/);
    expect(t.rationale.filter((l) => l.includes("Steps that bear on a decision"))).toHaveLength(1);
  });
  it("lists the ticked mitigations and their effect", () => {
    const four = tierOf({ mitigations: ["human_final_decision", "appeal_path", "predeployment_testing", "monitoring_plan"] });
    expect(four.rationale.join(" ")).toContain(
      "Mitigations in place (4 of 5): human makes the final decision, appeal path, pre-deployment testing, monitoring plan. Score reduced by 15%",
    );
    const one = tierOf({ mitigations: ["appeal_path"] });
    expect(one.rationale.join(" ")).toContain("Mitigations in place (1 of 5): appeal path. At least 4 of 5 lower the score by 15%.");
    expect(tierOf({ mitigations: [] }).rationale.join(" ")).toContain("No mitigations ticked.");
  });
});
