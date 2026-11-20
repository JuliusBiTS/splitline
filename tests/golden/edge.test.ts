/**
 * SPEC §10 edge goldens (engine-only). Crisis and low-readiness change only the operating model:
 * tier and verdict ignore them (ADR-0014 §3); Phase 2 asserts the scope note and the ramp (§5).
 */
import { describe, expect, it } from "vitest";
import { CRISIS_SCOPE_NOTE, LOW_READINESS_SCOPE_NOTE } from "@/engine/levers";
import { EDGE, run, triggeredIds } from "../fixtures/cases";

const find = (r: ReturnType<typeof run>, id: string) => r.triggeredRules.find((t) => t.ruleId === id);

describe("edge goldens (SPEC §10)", () => {
  it("federal institution + administrative decision → FED-DADM-01 as in-scope government policy", () => {
    const t = find(run(EDGE.federalAdminDecision), "FED-DADM-01");
    expect(t?.effectiveStatus).toBe("GOVERNMENT_POLICY");
    expect(t?.inScope).toBe(true);
    expect(t?.severity).toBe("action");
  });

  it("OSFI-regulated bank → OSFI-E23 (future) and INS-OSFI-GENAI when generative", () => {
    const gen = run(EDGE.osfiBankGenerative);
    expect(find(gen, "OSFI-E23")?.effectiveStatus).toBe("IN_FORCE_FUTURE");
    expect(find(gen, "INS-OSFI-GENAI")).toBeDefined();
    const ml = triggeredIds(EDGE.osfiBankClassical);
    expect(ml).toContain("OSFI-E23");
    expect(ml).not.toContain("INS-OSFI-GENAI");
  });

  it("Quebec residents + exclusively automated decision → QC-L25-121 at action", () => {
    expect(find(run(EDGE.quebecDecidesAlone), "QC-L25-121")?.severity).toBe("action");
  });

  it("Quebec decides_with_review without human_final_decision → QC-L25-121 at info, 'meaningful review'", () => {
    const t = find(run(EDGE.quebecWithReviewNoHfd), "QC-L25-121");
    expect(t?.severity).toBe("info");
    expect(t?.notes.join(" ")).toContain("meaningful");
    expect(triggeredIds(EDGE.quebecWithReviewHfd)).not.toContain("QC-L25-121");
  });

  it("crisis flag → temporary-centralization scope note that reverses P1; tier and verdict unchanged", () => {
    const crisis = run(EDGE.crisis);
    const base = run(EDGE.noPersonalData);
    expect(crisis.facts.crisisContext).toBe(true);
    expect(crisis.tier.level).toBe(base.tier.level);
    expect(crisis.verdict.verdict).toBe(base.verdict.verdict);
    expect(crisis.operatingModel.scopeNotes).toContain(CRISIS_SCOPE_NOTE);
    expect(CRISIS_SCOPE_NOTE).toMatch(/temporary centralization/i);
    expect(CRISIS_SCOPE_NOTE).toContain("reverses P1");
    expect(crisis.operatingModel.levers[0].setting).toMatch(/^Temporary centralization/);
    expect(base.operatingModel.scopeNotes).not.toContain(CRISIS_SCOPE_NOTE);
  });

  it("low readiness → gradual exchange ramp, enablement first; tier and verdict unchanged", () => {
    const low = run(EDGE.lowReadiness);
    const base = run(EDGE.noPersonalData);
    expect(low.facts.readiness).toBe("low");
    expect(low.tier.level).toBe(base.tier.level);
    expect(low.verdict.verdict).toBe(base.verdict.verdict);
    const exchange = low.operatingModel.levers[2];
    expect(exchange.setting).toMatch(/^Ramp up exchange gradually, enablement first/);
    expect(exchange.details.join(" ")).toContain("Gradual ramp");
    expect(low.operatingModel.scopeNotes).toContain(LOW_READINESS_SCOPE_NOTE);
    expect(base.operatingModel.levers[2].setting).not.toMatch(/gradually/);
  });

  it("no personal data → Go, no privacy rules", () => {
    const r = run(EDGE.noPersonalData);
    expect(r.verdict.verdict).toBe("go");
    const privacy = ["BC-PIPA-01", "BC-PIPA-EMP", "BC-FIPPA-XB", "FED-PIPEDA-XB", "FED-C36-XB", "QC-L25-121"];
    expect(r.triggeredRules.map((t) => t.ruleId).filter((id) => privacy.includes(id))).toEqual([]);
    expect(r.triggeredRules.every((t) => t.severity === "info")).toBe(true);
  });

  it("Ontario hiring with ≥ 25 employees → ON-ESA-AI at action; headcount unset → info 'confirm headcount'", () => {
    expect(find(run(EDGE.ontarioHiring25), "ON-ESA-AI")?.severity).toBe("action");
    const unset = find(run(EDGE.ontarioHiringUnset), "ON-ESA-AI");
    expect(unset?.severity).toBe("info");
    expect(unset?.notes.join(" ")).toContain("Confirm headcount");
  });

  it("ambient scribe in a health authority → BC-OIPC-SCRIBE", () => {
    expect(find(run(EDGE.ambientScribe), "BC-OIPC-SCRIBE")?.effectiveStatus).toBe("REGULATOR_GUIDANCE");
  });

  it("BC ministry: BC-GOV-GENAI triggers for a public tool, not for an approved enterprise tool", () => {
    expect(triggeredIds(EDGE.ministryPublicTool)).toContain("BC-GOV-GENAI");
    expect(triggeredIds(EDGE.ministryApprovedEnterprise)).not.toContain("BC-GOV-GENAI");
    expect(run(EDGE.ministryPublicTool).verdict.verdict).toBe("redesign");
  });
});
