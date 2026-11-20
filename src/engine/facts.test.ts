import { describe, expect, it } from "vitest";
import { BASE_INTAKE, CONSEQUENTIAL_DECOMPOSITION, PLAIN_DECOMPOSITION, subtask } from "../../tests/fixtures/cases";
import { consequentialFloorBlocks, deriveFacts, deriveReversibility } from "./facts";
import { IntakeInputSchema, type AiDecisionRole, type IntakeInputRaw, type Reversibility } from "./types";

const facts = (over: Partial<IntakeInputRaw> = {}, d = PLAIN_DECOMPOSITION) =>
  deriveFacts(IntakeInputSchema.parse({ ...BASE_INTAKE, ...over }), d);

describe("reversibility lookup (ADR-0004)", () => {
  const table: Array<[AiDecisionRole, boolean, boolean, Reversibility]> = [
    // role, up-pattern, appeal path → expected
    ["informs", false, false, "reversible_brief"],
    ["informs", true, false, "short_term"],
    ["informs", false, true, "reversible_brief"], // clamped
    ["recommends", false, false, "short_term"],
    ["recommends", true, false, "hard_to_reverse"],
    ["recommends", true, true, "short_term"],
    ["recommends", false, true, "reversible_brief"],
    ["decides_with_review", false, false, "short_term"],
    ["decides_with_review", true, false, "hard_to_reverse"],
    ["decides_alone", false, false, "hard_to_reverse"],
    ["decides_alone", true, false, "irreversible"],
    ["decides_alone", true, true, "hard_to_reverse"],
  ];
  it.each(table)("%s, up=%s, appeal=%s → %s", (role, up, appeal, expected) => {
    expect(deriveReversibility(role, up ? ["hiring_selection"] : [], appeal)).toBe(expected);
  });

  it("each of hiring, clinical triage and claims patterns moves one step up; others do not", () => {
    for (const p of ["hiring_selection", "clinical_triage", "claims_eligibility"] as const) {
      expect(deriveReversibility("recommends", [p], false)).toBe("hard_to_reverse");
    }
    for (const p of ["performance_management", "ambient_scribe", "administrative_decision", "customer_chatbot"] as const) {
      expect(deriveReversibility("recommends", [p], false)).toBe("short_term");
    }
  });

  it("an override replaces the derived value and is flagged", () => {
    const f = facts({ aiDecisionRole: "recommends", reversibilityOverride: "irreversible" });
    expect(f.reversibility).toBe("irreversible");
    expect(f.reversibilityDerived).toBe("short_term");
    expect(f.reversibilityOverridden).toBe(true);
  });
});

describe("scale and vulnerability (derived, capped at 3)", () => {
  it("is 0 for businesses only and low volume", () => {
    expect(facts().scale).toBe(0);
  });
  it("patients count for vulnerability and for public reach", () => {
    expect(facts({ affectedPeople: ["patients"] }).scale).toBe(2);
  });
  it("children add vulnerability; public customers add reach", () => {
    expect(facts({ dataCategories: ["children"], affectedPeople: ["public_customers"] }).scale).toBe(2);
  });
  it("a high-volume subtask that affects individuals adds one; the total caps at 3", () => {
    expect(facts({ affectedPeople: ["patients"], dataCategories: ["children"] }, CONSEQUENTIAL_DECOMPOSITION).scale).toBe(3);
  });
});

describe("derived flags", () => {
  it("treats hosting `unsure` as cross-border and flags it as unknown", () => {
    const f = facts({ hosting: "unsure" });
    expect(f.crossBorder).toBe(true);
    expect(f.hostingUnknown).toBe(true);
  });
  it("finds likely sensitive categories", () => {
    expect(facts({ dataCategories: ["customer_pi", "health", "financial"] }).sensitiveCategories).toEqual([
      "health",
      "financial",
    ]);
  });
  it("other_canadian_private is under BC PIPA only with BC in jurisdictions", () => {
    expect(facts({ orgType: "other_canadian_private", jurisdictions: ["ontario"] }).bcPipaOrg).toBe(false);
    expect(facts({ orgType: "other_canadian_private", jurisdictions: ["bc"] }).bcPipaOrg).toBe(true);
  });
  it("defaults dynamism from AI type and keeps a user value", () => {
    expect(facts({ aiType: "generative_llm" }).dynamism).toBe("high");
    expect(facts({ aiType: "classical_ml" }).dynamism).toBe("low");
    expect(facts({ aiType: "generative_llm", dynamism: "medium" }).dynamism).toBe("medium");
  });
  it("never copies the free-text description into the facts", () => {
    expect(JSON.stringify(facts())).not.toContain("Fictional test case. Staff");
  });
});

describe("consequential floor (ADR-0006)", () => {
  const people = { aiDecisionRole: "recommends" as const, affectedPeople: ["public_customers" as const] };
  it("blocks when the AI does more than inform, people are affected and no step is consequential", () => {
    expect(consequentialFloorBlocks(people, PLAIN_DECOMPOSITION)).toBe(true);
  });
  it("unblocks when a step is marked consequential", () => {
    expect(consequentialFloorBlocks(people, CONSEQUENTIAL_DECOMPOSITION)).toBe(false);
  });
  it("unblocks on explicit confirmation that none is", () => {
    expect(consequentialFloorBlocks(people, { ...PLAIN_DECOMPOSITION, confirmedNoConsequential: true })).toBe(false);
  });
  it("does not block when the AI only informs", () => {
    expect(consequentialFloorBlocks({ ...people, aiDecisionRole: "informs" }, PLAIN_DECOMPOSITION)).toBe(false);
  });
  it("does not block when only businesses are affected", () => {
    expect(consequentialFloorBlocks({ ...people, affectedPeople: ["businesses_only"] }, PLAIN_DECOMPOSITION)).toBe(false);
  });
  it("records which subtasks are consequential", () => {
    const d = { ...PLAIN_DECOMPOSITION, subtasks: [subtask("s1", { consequential: true, name: "Decide" }), subtask("s2"), subtask("s3")] };
    expect(facts({}, d).consequentialSubtasks).toEqual([{ id: "s1", name: "Decide" }]);
  });
});
