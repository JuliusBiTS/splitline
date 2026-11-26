import { describe, expect, it } from "vitest";
import { getPreset } from "@/content/presets";
import { computeCase } from "@/engine";
import { consequentialFloorBlocks } from "@/engine/facts";
import { checkGolden } from "./check";
import { GOLDEN } from "./expectations";
import { TEST_TODAY } from "../fixtures/cases";

describe.each(GOLDEN.map((g) => [g.slug, g] as const))("golden preset %s (SPEC §10)", (slug, exp) => {
  const preset = getPreset(slug);
  if (!preset) throw new Error(`missing preset ${slug}`);
  const r = computeCase(preset.intake, preset.decomposition, { today: TEST_TODAY });

  it(`tier is exactly ${exp.tier}`, () => {
    expect(r.tier.level).toBe(exp.tier);
  });
  it(`verdict is ${exp.verdict}`, () => {
    expect(r.verdict.verdict).toBe(exp.verdict);
  });
  it("must-trigger, must-not-trigger and status expectations hold", () => {
    expect(checkGolden(r, exp)).toEqual([]);
  });
  it("starting split owners match the key subtasks (02_* §3.2)", () => {
    const owners = Object.fromEntries(r.operatingModel.split.map((s) => [s.subtaskId, s.owner]));
    expect(owners).toEqual(exp.split);
    expect(r.operatingModel.isStartingSplit).toBe(true);
  });
  it(`drift check missing = [${exp.driftMissing.join(", ")}]`, () => {
    expect(r.operatingModel.driftCheck.missing).toEqual(exp.driftMissing);
    expect(r.operatingModel.driftCheck.ok).toBe(exp.driftMissing.length === 0);
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

describe("HR preset drift check (PLAN Phase 2)", () => {
  it("flags the efficiency-only KPIs and suggests augmentation-value and learning-loop KPIs", () => {
    const p = getPreset("hiring-and-sentiment");
    if (!p) throw new Error("hiring");
    expect(p.intake.proposedKpis).toEqual(["Time to shortlist", "Cost per hire"]);
    const d = computeCase(p.intake, p.decomposition, { today: TEST_TODAY }).operatingModel.driftCheck;
    expect(d.ok).toBe(false);
    expect(d.missing).toEqual(["augmentation_value", "learning_loop"]);
    expect(d.suggestedKpis.length).toBeGreaterThan(0);
  });
});

describe("golden score breakdowns (ADR-0004)", () => {
  const score = (slug: string) => {
    const p = getPreset(slug);
    if (!p) throw new Error(slug);
    return computeCase(p.intake, p.decomposition, { today: TEST_TODAY }).tier;
  };
  it("clinical: raw 23, no deduction", () => {
    const t = score("clinical-referral-triage");
    expect([t.rawScore, t.mitigationDeductionApplied]).toEqual([23, false]);
  });
  it("contract: raw 12 (recorded decomposition: extraction touches individuals, scale 1; ADR-0019)", () => {
    expect(score("contract-clause-review").rawScore).toBe(12);
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
    const r = computeCase({ ...p.intake, mitigations: ["human_final_decision", "appeal_path", "monitoring_plan"] }, p.decomposition, { today: TEST_TODAY });
    expect(r.tier.level).toBe("III");
  });
});
