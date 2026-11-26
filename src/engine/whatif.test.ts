import { describe, expect, it } from "vitest";
import { getPreset } from "@/content/presets";
import { EDGE, makeCase, run, TEST_TODAY } from "../../tests/fixtures/cases";
import { computeCase } from "./index";
import { WhatIfDiffSchema } from "./types";
import { applyWhatIf, computeWhatIf, diffResults } from "./whatif";

const opts = { today: TEST_TODAY };

function presetCase(slug: string) {
  const p = getPreset(slug);
  if (!p) throw new Error(slug);
  return { intake: p.intake, decomposition: p.decomposition, base: computeCase(p.intake, p.decomposition, opts) };
}

describe("applyWhatIf (SPEC §7.6 toggles)", () => {
  const intake = EDGE.noPersonalData.intake;

  it("leaves the intake unchanged with no toggles and does not mutate the input", () => {
    const copy = structuredClone(intake);
    expect(applyWhatIf(intake, {})).toEqual(intake);
    expect(intake).toEqual(copy);
  });

  it("sets hosting, decision role, crisis, dynamism and customer-facing output", () => {
    const r = applyWhatIf(intake, {
      hosting: "us_or_global_api",
      aiDecisionRole: "decides_alone",
      crisisContext: true,
      dynamism: "high",
      customerFacingOutput: true,
    });
    expect([r.hosting, r.aiDecisionRole, r.crisisContext, r.dynamism, r.customerFacingOutput]).toEqual([
      "us_or_global_api",
      "decides_alone",
      true,
      "high",
      true,
    ]);
  });

  it("adds and removes Quebec and Ontario without duplicates", () => {
    const on = applyWhatIf(intake, { quebecAffected: true, ontarioAffected: true });
    expect(on.jurisdictions).toEqual(["bc", "quebec", "ontario"]);
    expect(applyWhatIf(on, { quebecAffected: true }).jurisdictions).toEqual(["bc", "ontario", "quebec"]);
    expect(applyWhatIf(on, { quebecAffected: false, ontarioAffected: false }).jurisdictions).toEqual(["bc"]);
  });

  it("removing the only province leaves other provinces (the intake needs one jurisdiction)", () => {
    const qcOnly = { ...intake, jurisdictions: ["quebec" as const] };
    expect(applyWhatIf(qcOnly, { quebecAffected: false }).jurisdictions).toEqual(["other_provinces"]);
  });

  it("rejects invalid toggle values", () => {
    expect(() => applyWhatIf(intake, { hosting: "mars" as never })).toThrow();
  });
});

describe("diffResults", () => {
  it("identical results → 'Tier unchanged', 'Verdict unchanged', nothing else", () => {
    const r = run(EDGE.noPersonalData);
    const d = diffResults(r, r);
    expect(d.chips).toEqual(["Tier unchanged", "Verdict unchanged"]);
    expect(d.decisionRights.changed).toBe(false);
    expect(() => WhatIfDiffSchema.parse(d)).not.toThrow();
    const crisis = computeWhatIf(r, EDGE.noPersonalData.intake, EDGE.noPersonalData.decomposition, { crisisContext: true }, opts);
    expect(() => WhatIfDiffSchema.parse(crisis.diff)).not.toThrow();
    expect([d.scopeNotesAdded, d.scopeNotesRemoved]).toEqual([[], []]);
    expect([d.rulesAdded, d.rulesRemoved, d.rulesChangedSeverity, d.splitChanges]).toEqual([[], [], [], []]);
  });

  it("hosting → in_canada on the contract preset removes cross-border rules", () => {
    const { intake, decomposition, base } = presetCase("contract-clause-review");
    const { diff } = computeWhatIf(base, intake, decomposition, { hosting: "in_canada" }, opts);
    expect(diff.rulesRemoved).toContain("FED-PIPEDA-XB");
    expect(diff.chips.some((c) => /^−\d+ rules?$/.test(c))).toBe(true);
  });

  it("decision role → decides_alone raises the claims tier II → III (split already reviewed)", () => {
    const { intake, decomposition, base } = presetCase("claims-document-intake");
    const { diff } = computeWhatIf(base, intake, decomposition, { aiDecisionRole: "decides_alone" }, opts);
    expect(diff.chips[0]).toBe("Tier II → III");
    expect(diff.splitChanges).toEqual([]);
  });

  it("reaching tier IV moves the decision step to human (split-owner chip)", () => {
    const c = makeCase(
      "patients, tier IV with decides_alone",
      { aiDecisionRole: "recommends", affectedPeople: ["patients"], dataCategories: ["health"] },
      EDGE.privateInsurerClaims.decomposition,
    );
    const base = run(c);
    const { result, diff } = computeWhatIf(base, c.intake, c.decomposition, { aiDecisionRole: "decides_alone" }, opts);
    expect(result.tier.level).toBe("IV");
    expect(base.tier.level).not.toBe("IV");
    expect(diff.splitChanges).toEqual([{ subtaskId: "s2", from: "machine_review", to: "human" }]);
    expect(diff.chips).toContain("1 split owner changed");
  });

  it("Quebec affected adds Law 25 rules (+n rules chip)", () => {
    const c = makeCase("qc", { aiDecisionRole: "decides_alone", dataCategories: ["customer_pi"], affectedPeople: ["public_customers"] }, EDGE.privateInsurerClaims.decomposition);
    const base = run(c);
    const { diff } = computeWhatIf(base, c.intake, c.decomposition, { quebecAffected: true }, opts);
    expect(diff.rulesAdded).toContain("QC-L25-121");
    expect(diff.chips.some((x) => /^\+\d+ rules?$/.test(x))).toBe(true);
  });

  it("dynamism change shows the cadence change; crisis leaves tier and verdict unchanged", () => {
    const { intake, decomposition, base } = presetCase("hiring-and-sentiment");
    const dyn = computeWhatIf(base, intake, decomposition, { dynamism: "high" }, opts).diff;
    expect(dyn.cadence).toEqual({ from: "quarterly", to: "monthly", changed: true });
    expect(dyn.chips).toContain("Split review: quarterly → monthly");
    const crisis = computeWhatIf(base, intake, decomposition, { crisisContext: true }, opts).diff;
    expect(crisis.chips.slice(0, 2)).toEqual(["Tier unchanged", "Verdict unchanged"]);
    // The P1 reversal is visible in the diff (02_* §1.10, §3.3).
    expect(crisis.decisionRights.changed).toBe(true);
    expect(crisis.decisionRights.to).toMatch(/^Temporary centralization/);
    expect(crisis.chips).toContain("Who decides the split: temporary centralization (the team no longer sets the split)");
    expect(crisis.scopeNotesAdded.some((n) => n.includes("reverses the usual rule"))).toBe(true);
    expect(crisis.scopeNotesRemoved).toEqual([]);
  });

  it("turning crisis off returns decision rights to the team and removes the crisis note", () => {
    const c = EDGE.crisis;
    const base = run(c);
    const d = computeWhatIf(base, c.intake, c.decomposition, { crisisContext: false }, opts).diff;
    expect(d.chips).toContain("Who decides the split: the team sets the split");
    expect(d.scopeNotesRemoved.some((n) => n.includes("reverses the usual rule"))).toBe(true);
  });

  it("the scope switch shows as central guardrails in the diff", () => {
    const c = EDGE.federalAdminDecision;
    const base = run(c);
    const d = computeWhatIf(base, c.intake, c.decomposition, { aiDecisionRole: "decides_alone" }, opts);
    expect(["III", "IV"]).toContain(d.result.tier.level);
    expect(d.diff.chips).toContain("Who decides the split: central guardrails, local proposals");
  });

  it("reports verdict changes and severity changes of rules present in both results", () => {
    const { intake, decomposition, base } = presetCase("contract-clause-review");
    const after = computeCase({ ...intake, hosting: "unsure" }, decomposition, opts);
    const d = diffResults(base, after);
    expect(d.verdict.changed).toBe(base.verdict.verdict !== after.verdict.verdict);
    const fake = { ...after, verdict: { ...after.verdict, verdict: "redesign" as const }, triggeredRules: after.triggeredRules.map((t, i) => (i === 0 ? { ...t, severity: t.severity === "info" ? ("action" as const) : ("info" as const) } : t)) };
    const d2 = diffResults(base, fake);
    expect(d2.chips).toContain("Verdict: Go with conditions → Redesign");
    expect(base.triggeredRules[0]?.ruleId).toBe(fake.triggeredRules[0]?.ruleId);
    expect(d2.rulesChangedSeverity).toHaveLength(1);
    expect(d2.chips).toContain("1 rule changed severity");
  });
});
