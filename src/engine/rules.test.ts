import { describe, expect, it } from "vitest";
import { getRule } from "@/content/rules";
import { EDGE, makeCase, run } from "../../tests/fixtures/cases";
import { effectiveStatusOf, severityCap, statusLabel, UNSURE_HOSTING_ACTION } from "./rules";
import { RuleStatusSchema, type IntakeInputRaw, type RuleStatus, type Severity } from "./types";

describe("severity cap by effective status (SPEC §7.1, ADR-0007)", () => {
  const expected: Record<RuleStatus, { inScope: Severity; outOfScope: Severity; draft?: Severity }> = {
    IN_FORCE: { inScope: "blocker", outOfScope: "blocker" },
    IN_FORCE_FUTURE: { inScope: "blocker", outOfScope: "blocker" },
    GOVERNMENT_POLICY: { inScope: "blocker", outOfScope: "info" },
    REGULATOR_GUIDANCE: { inScope: "blocker", outOfScope: "blocker", draft: "action" },
    PROPOSED: { inScope: "info", outOfScope: "info" },
    VOLUNTARY: { inScope: "info", outOfScope: "info" },
    REFERENCE: { inScope: "info", outOfScope: "info" },
  };
  for (const status of RuleStatusSchema.options) {
    it(`${status}`, () => {
      const e = expected[status];
      expect(severityCap(status, { inScope: true, draft: false })).toBe(e.inScope);
      expect(severityCap(status, { inScope: false, draft: false })).toBe(e.outOfScope);
      if (e.draft) expect(severityCap(status, { inScope: true, draft: true })).toBe(e.draft);
    });
  }
  it("PROPOSED never rises above info, even when a rule asks for blocker", () => {
    expect(severityCap("PROPOSED", { inScope: true, draft: false })).toBe("info");
  });
});

describe("effective status (ADR-0012)", () => {
  it("falls back to REFERENCE out of scope", () => {
    expect(effectiveStatusOf({ status: "GOVERNMENT_POLICY" }, false)).toBe("REFERENCE");
    expect(effectiveStatusOf({ status: "GOVERNMENT_POLICY", statusWhenOutOfScope: "VOLUNTARY" }, false)).toBe("VOLUNTARY");
    expect(effectiveStatusOf({ status: "GOVERNMENT_POLICY" }, true)).toBe("GOVERNMENT_POLICY");
  });
});

describe("UI status labels", () => {
  const label = (id: string, inScope: boolean, effectiveStatus: RuleStatus) => {
    const rule = getRule(id);
    if (!rule) throw new Error(id);
    return statusLabel(rule, { inScope, effectiveStatus });
  };
  it("uses the SPEC §7.1 wording", () => {
    expect(label("BC-PIPA-01", true, "IN_FORCE")).toBe("Applies");
    expect(label("OSFI-E23", true, "IN_FORCE_FUTURE")).toBe("Applies from 2027-05-01");
    expect(label("FED-DADM-01", true, "GOVERNMENT_POLICY")).toBe("Mandatory for federal institutions");
    expect(label("FED-DADM-01", false, "REFERENCE")).toBe("Mandatory for federal institutions; reference elsewhere");
    expect(label("BC-PIPA-MON", true, "REGULATOR_GUIDANCE")).toBe("Regulator expects");
    expect(label("FED-OPC-VENDOR", true, "REGULATOR_GUIDANCE")).toBe("Regulator draft (consultation until 2026-12-04)");
    expect(label("FED-C36-XB", true, "PROPOSED")).toBe("Prepare for (proposed)");
    expect(label("VC-GENAI-MGR", true, "VOLUNTARY")).toBe("Good practice");
    expect(label("INS-FAIR", false, "REFERENCE")).toBe("Reference framework");
  });
});

describe("hosting `unsure` behaves like outside Canada (ADR-0007 §5)", () => {
  const crossBorderRules = ["BC-FIPPA-XB", "FED-PIPEDA-XB", "FED-C36-XB", "FED-OPC-VENDOR"];
  const cases: Array<Partial<IntakeInputRaw>> = [
    { orgType: "bc_public_body", dataCategories: ["health"] },
    { orgType: "bc_private", dataCategories: ["customer_pi"] },
  ];
  for (const over of cases) {
    it(`${over.orgType}: same rules, severities and statuses`, () => {
      const outside = run(makeCase("outside", { ...over, hosting: "us_or_global_api" }));
      const unsure = run(makeCase("unsure", { ...over, hosting: "unsure" }));
      const pick = (r: typeof outside) =>
        r.triggeredRules.map((t) => [t.ruleId, t.effectiveStatus, t.severity]).filter(([id]) => crossBorderRules.includes(String(id)));
      expect(pick(unsure)).toEqual(pick(outside));
      expect(pick(unsure).length).toBeGreaterThan(0);
      expect(unsure.verdict.verdict).toBe(outside.verdict.verdict);
      for (const t of unsure.triggeredRules.filter((x) => crossBorderRules.includes(x.ruleId))) {
        expect(t.matchedFacts).toContain("Hosting unknown; assumed outside Canada");
        expect(t.actions).toContain(UNSURE_HOSTING_ACTION);
      }
    });
  }
  it("in Canada triggers none of the cross-border rules", () => {
    const r = run(makeCase("in", { orgType: "bc_private", dataCategories: ["customer_pi"], hosting: "in_canada" }));
    expect(r.triggeredRules.map((t) => t.ruleId).filter((id) => crossBorderRules.slice(0, 3).includes(id))).toEqual([]);
  });
});

describe("BC-FIPPA-XB sensitive-PI tiers (ADR-0007 §4)", () => {
  const fippaXb = (dataCategories: IntakeInputRaw["dataCategories"]) =>
    run(makeCase("x", { orgType: "bc_public_body", hosting: "us_or_global_api", dataCategories })).triggeredRules.find(
      (t) => t.ruleId === "BC-FIPPA-XB",
    );
  it.each(["health", "biometric", "children", "financial"] as const)("%s → action, heuristic wording", (d) => {
    const t = fippaXb([d]);
    expect(t?.severity).toBe("action");
    expect(t?.notes.join(" ")).toContain("Splitline heuristic");
  });
  it.each(["customer_pi", "employee_hr"] as const)("%s → info, 'assess whether sensitive'", (d) => {
    const t = fippaXb([d]);
    expect(t?.severity).toBe("info");
    expect(t?.notes.join(" ")).toContain("Assess whether this information is sensitive");
  });
  it("keeps the s. 30 action in both tiers", () => {
    for (const d of ["health", "customer_pi"] as const) {
      expect(fippaXb([d])?.actions).toContain("Assess the foreign legal framework and reasonable security (FIPPA s. 30).");
    }
  });
  it("no_personal alone does not trigger", () => {
    expect(fippaXb(["no_personal"])).toBeUndefined();
  });
});

describe("matched facts", () => {
  it("names the intake values that triggered the rule", () => {
    const t = run(EDGE.ministryPublicTool).triggeredRules.find((x) => x.ruleId === "BC-GOV-GENAI");
    expect(t?.matchedFacts).toContain("Generative AI tool type: public generative AI tool");
    expect(t?.matchedFacts).toContain("Organization type: BC public body");
  });
});
