import { describe, expect, it } from "vitest";
import { classifyKpi, driftCheck, SUGGESTED_KPIS } from "./drift";

describe("KPI classification (ADR-0016 §9)", () => {
  it.each([
    ["Time to shortlist", ["efficiency"]],
    ["Cost per hire", ["efficiency"]],
    ["Straight-through processing rate", ["efficiency"]],
    ["Adjuster corrections per 100 claims", ["learning_loop"]],
    ["Override rate within band", ["learning_loop"]],
    ["Split changes per quarter", ["learning_loop"]],
    ["Decision quality on non-routine cases", ["augmentation_value"]],
    ["Rework avoided", ["augmentation_value"]],
    ["Share of referrals returned for missing information", []],
  ])("%s → %j", (kpi, kinds) => {
    expect(classifyKpi(kpi)).toEqual(kinds);
  });

  it("every suggested KPI classifies as its own kind", () => {
    for (const [kind, list] of Object.entries(SUGGESTED_KPIS))
      for (const k of list) expect(classifyKpi(k), k).toContain(kind);
  });
});

describe("drift check (`02_*` §3.6)", () => {
  it("efficiency-only KPIs → warning, both missing, with suggestions", () => {
    const d = driftCheck(["Time to shortlist", "Cost per hire"]);
    expect(d.ok).toBe(false);
    expect(d.missing).toEqual(["augmentation_value", "learning_loop"]);
    expect(d.suggestedKpis).toEqual([...SUGGESTED_KPIS.augmentation_value, ...SUGGESTED_KPIS.learning_loop]);
  });

  it("no KPIs at all → both missing", () => {
    expect(driftCheck([]).missing).toEqual(["augmentation_value", "learning_loop"]);
  });

  it("a complete set passes with no suggestions", () => {
    const d = driftCheck(["Cycle time", "Decision quality on non-routine cases", "Corrections fed back per month"]);
    expect(d).toEqual({ ok: true, missing: [], suggestedKpis: [] });
  });

  it("efficiency is not required for the drift check (only 2 and 3 trigger the warning)", () => {
    expect(driftCheck(["Rework avoided", "Override rate"]).ok).toBe(true);
  });
});
