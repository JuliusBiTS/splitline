import { describe, expect, it } from "vitest";
import { getPreset } from "@/content/presets";
import { computeCase } from "@/engine";
import { consequentialFloorBlocks } from "@/engine/facts";
import { checkGolden } from "./check";
import { GOLDEN } from "./expectations";

describe.each(GOLDEN.map((g) => [g.slug, g] as const))("golden preset %s (SPEC §10)", (slug, exp) => {
  const preset = getPreset(slug);
  if (!preset) throw new Error(`missing preset ${slug}`);
  const r = computeCase(preset.intake, preset.decomposition);

  it(`tier is exactly ${exp.tier}`, () => {
    expect(r.tier.level).toBe(exp.tier);
  });
  it(`verdict is ${exp.verdict}`, () => {
    expect(r.verdict.verdict).toBe(exp.verdict);
  });
  it("must-trigger, must-not-trigger and status expectations hold", () => {
    expect(checkGolden(r, exp)).toEqual([]);
  });
  it("passes the consequential floor", () => {
    expect(consequentialFloorBlocks(preset.intake, preset.decomposition)).toBe(false);
  });
  it("has top conditions only from action-or-higher rules", () => {
    for (const id of r.verdict.topConditions) {
      const t = r.triggeredRules.find((x) => x.ruleId === id);
      expect(t?.severity).not.toBe("info");
    }
  });
});

describe("golden score breakdowns (ADR-0004)", () => {
  const score = (slug: string) => {
    const p = getPreset(slug);
    if (!p) throw new Error(slug);
    return computeCase(p.intake, p.decomposition).tier;
  };
  it("clinical: raw 23, no deduction", () => {
    const t = score("clinical-referral-triage");
    expect([t.rawScore, t.mitigationDeductionApplied]).toEqual([23, false]);
  });
  it("contract: raw 11", () => {
    expect(score("contract-clause-review").rawScore).toBe(11);
  });
  it("hiring: raw 26 (pinned IV)", () => {
    const t = score("hiring-and-sentiment");
    expect([t.rawScore, t.level]).toEqual([26, "IV"]);
  });
  it("claims: raw 18, 4 of 5 mitigations → 15.3, stays at II", () => {
    const t = score("claims-document-intake");
    expect(t.rawScore).toBe(18);
    expect(t.mitigationDeductionApplied).toBe(true);
    expect(t.score).toBeCloseTo(15.3, 10);
  });
  it("claims would be tier III without the mitigation deduction (What-if story)", () => {
    const p = getPreset("claims-document-intake");
    if (!p) throw new Error("claims");
    const r = computeCase({ ...p.intake, mitigations: ["human_final_decision", "appeal_path", "monitoring_plan"] }, p.decomposition);
    expect(r.tier.level).toBe("III");
  });
});
