import { describe, expect, it } from "vitest";
import { EDGE, makeCase, PRESET_CASES, run, triggeredIds } from "../../../tests/fixtures/cases";
import { ruleCases } from "../../../tests/fixtures/rule-cases";

const preset = (slug: string) => {
  const p = PRESET_CASES.find((c) => c.name === slug);
  if (!p) throw new Error(slug);
  return p;
};
const clinical = preset("clinical-referral-triage");
const contract = preset("contract-clause-review");
const hiring = preset("hiring-and-sentiment");
const claims = preset("claims-document-intake");

describe("federal rules", () => {
  ruleCases([
    { ruleId: "FED-PIPEDA-XB", triggers: contract, status: "IN_FORCE", severity: "action", doesNotTrigger: claims },
    { ruleId: "FED-OPC-VENDOR", triggers: contract, status: "REGULATOR_GUIDANCE", severity: "action", doesNotTrigger: EDGE.noPersonalData },
    { ruleId: "FED-C36-ADM", triggers: EDGE.osfiBankGenerative, status: "PROPOSED", severity: "info", doesNotTrigger: hiring },
    { ruleId: "FED-C36-XB", triggers: contract, status: "PROPOSED", severity: "info", doesNotTrigger: claims },
    { ruleId: "FED-DADM-01", triggers: EDGE.federalAdminDecision, status: "GOVERNMENT_POLICY", severity: "action", doesNotTrigger: contract },
    { ruleId: "FED-DADM-HITL", triggers: clinical, status: "REFERENCE", severity: "info", doesNotTrigger: contract },
    { ruleId: "OSFI-E23", triggers: EDGE.osfiBankGenerative, status: "IN_FORCE_FUTURE", severity: "action", doesNotTrigger: contract },
    { ruleId: "INS-OSFI-GENAI", triggers: EDGE.osfiBankGenerative, status: "REGULATOR_GUIDANCE", severity: "action", doesNotTrigger: EDGE.osfiBankClassical },
    { ruleId: "VC-GENAI-MGR", triggers: clinical, status: "VOLUNTARY", severity: "info", doesNotTrigger: hiring },
    { ruleId: "HC-SAMD-01", triggers: clinical, status: "IN_FORCE", severity: "action", doesNotTrigger: claims },
  ]);

  it("REF-AIA-TIER always applies, as a reference at info", () => {
    const t = run(contract).triggeredRules.find((x) => x.ruleId === "REF-AIA-TIER");
    expect(t?.effectiveStatus).toBe("REFERENCE");
    expect(t?.severity).toBe("info");
  });

  it("FED-OPC-VENDOR is only a reference for public bodies (ADR-0012)", () => {
    const t = run(clinical).triggeredRules.find((x) => x.ruleId === "FED-OPC-VENDOR");
    expect(t?.effectiveStatus).toBe("REFERENCE");
    expect(t?.severity).toBe("info");
  });

  it("FED-OPC-VENDOR stays a draft, capped at action", () => {
    const t = run(contract).triggeredRules.find((x) => x.ruleId === "FED-OPC-VENDOR");
    expect(t?.severity).toBe("action");
  });

  it("FED-C36-ADM does not trigger for a provincial employer's own staff (ADR-0012)", () => {
    expect(triggeredIds(hiring)).not.toContain("FED-C36-ADM");
  });

  it("FED-C36-ADM triggers for a private org deciding about the public", () => {
    expect(triggeredIds(EDGE.quebecDecidesAlone)).toContain("FED-C36-ADM");
  });

  it("FED-DADM-01 is a reference outside federal institutions", () => {
    const c = makeCase("bc admin decision", {
      orgType: "bc_public_body",
      aiDecisionRole: "recommends",
      affectedPeople: ["public_customers"],
      useCasePatterns: ["administrative_decision"],
    });
    const t = run(c).triggeredRules.find((x) => x.ruleId === "FED-DADM-01");
    expect(t?.effectiveStatus).toBe("REFERENCE");
    expect(t?.severity).toBe("info");
  });

  it("FED-DADM-HITL in scope for a federal institution: policy, capped at action, official-AIA wording", () => {
    const t = run(EDGE.federalHighTier).triggeredRules.find((x) => x.ruleId === "FED-DADM-HITL");
    expect(t?.effectiveStatus).toBe("GOVERNMENT_POLICY");
    expect(t?.severity).toBe("action");
    expect(t?.notes.join(" ")).toContain("If your official AIA returns Level III or IV");
  });

  it("FED-DADM-HITL outside federal institutions cites Appendix C as reference only", () => {
    const t = run(clinical).triggeredRules.find((x) => x.ruleId === "FED-DADM-HITL");
    expect(t?.notes.join(" ")).toContain("mandatory for federal institutions only");
  });
});
