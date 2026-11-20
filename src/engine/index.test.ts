import { describe, expect, it } from "vitest";
import { PRESET_CASES, run, TEST_TODAY } from "../../tests/fixtures/cases";
import { computeCase } from "./index";
import { computeTier } from "./tier";
import type { UseCasePattern } from "./types";

describe("evaluation order (ADR-0007)", () => {
  it("is acyclic: the tier is the same with or without the rule catalogue", () => {
    for (const c of PRESET_CASES) {
      const withRules = computeCase(c.intake, c.decomposition, { today: TEST_TODAY });
      const noRules = computeCase(c.intake, c.decomposition, { today: TEST_TODAY, catalogue: [] });
      expect(noRules.tier).toEqual(withRules.tier);
      expect(noRules.triggeredRules).toEqual([]);
    }
  });

  it("the tier reads only base facts (adding a tier to the input changes nothing)", () => {
    for (const c of PRESET_CASES) {
      const r = run(c);
      const base: Partial<typeof r.facts> = { ...r.facts };
      delete base.indicativeTier;
      expect(computeTier(base as typeof r.facts)).toEqual(r.tier);
      expect(computeTier({ ...r.facts, indicativeTier: "I" } as typeof r.facts)).toEqual(r.tier);
    }
  });
});

describe("suggested patterns are never applied automatically (ADR-0006)", () => {
  const ALL: UseCasePattern[] = [
    "hiring_selection",
    "performance_management",
    "clinical_triage",
    "ambient_scribe",
    "claims_eligibility",
    "administrative_decision",
    "customer_chatbot",
  ];
  it.each(PRESET_CASES.map((c) => [c.name, c] as const))("%s: output is unchanged by suggestions", (_n, c) => {
    const base = run(c);
    const suggested = run({ ...c, decomposition: { ...c.decomposition, suggestedUseCasePatterns: ALL } });
    expect(suggested.tier).toEqual(base.tier);
    expect(suggested.triggeredRules).toEqual(base.triggeredRules);
    expect(suggested.verdict).toEqual(base.verdict);
  });

  it("the same pattern changes the output once it is ticked", () => {
    const c = PRESET_CASES.find((x) => x.name === "contract-clause-review");
    if (!c) throw new Error("contract");
    const ticked = run({ ...c, intake: { ...c.intake, useCasePatterns: ["claims_eligibility"] } });
    expect(ticked.triggeredRules.map((t) => t.ruleId)).toContain("BC-HRC-01");
  });
});

describe("free text is never read", () => {
  it("changing title and description does not change the result", () => {
    for (const c of PRESET_CASES) {
      const other = run({
        ...c,
        intake: { ...c.intake, title: "Something else", processDescription: "x".repeat(300) },
      });
      const base = run(c);
      expect(other.triggeredRules).toEqual(base.triggeredRules);
      expect(other.tier).toEqual(base.tier);
    }
  });
});
