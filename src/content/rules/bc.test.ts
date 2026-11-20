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

describe("BC rules", () => {
  ruleCases([
    { ruleId: "BC-PIPA-01", triggers: contract, status: "IN_FORCE", severity: "action", doesNotTrigger: clinical },
    { ruleId: "BC-PIPA-EMP", triggers: hiring, status: "IN_FORCE", severity: "action", doesNotTrigger: contract },
    { ruleId: "BC-PIPA-MON", triggers: hiring, status: "REGULATOR_GUIDANCE", severity: "blocker", doesNotTrigger: contract },
    { ruleId: "BC-FIPPA-01", triggers: claims, status: "IN_FORCE", severity: "action", doesNotTrigger: hiring },
    { ruleId: "BC-FIPPA-XB", triggers: claims, status: "IN_FORCE", severity: "action", doesNotTrigger: EDGE.ambientScribe },
    {
      ruleId: "BC-GOV-GENAI",
      triggers: EDGE.ministryPublicTool,
      status: "GOVERNMENT_POLICY",
      severity: "blocker",
      doesNotTrigger: EDGE.ministryApprovedEnterprise,
    },
    { ruleId: "BC-HRC-01", triggers: claims, status: "IN_FORCE", severity: "action", doesNotTrigger: contract },
    {
      ruleId: "BC-OIPC-SCRIBE",
      triggers: EDGE.ambientScribe,
      status: "REGULATOR_GUIDANCE",
      severity: "action",
      doesNotTrigger: clinical,
    },
    { ruleId: "INS-FAIR", triggers: EDGE.privateInsurerClaims, status: "REGULATOR_GUIDANCE", severity: "action", doesNotTrigger: clinical },
    { ruleId: "LIAB-CUSTFACING", triggers: EDGE.customerChatbot, status: "REFERENCE", severity: "info", doesNotTrigger: contract },
  ]);

  it("BC-PIPA-01 leaves employee-only data to BC-PIPA-EMP", () => {
    expect(triggeredIds(hiring)).not.toContain("BC-PIPA-01");
  });

  it("BC-PIPA-MON triggers on monitoring alone, outside HR (ADR-0012)", () => {
    expect(triggeredIds(EDGE.employeeMonitoringOnly)).toContain("BC-PIPA-MON");
  });

  it("BC-PIPA-MON triggers on HR + performance management without the monitoring flag", () => {
    const c = makeCase("hr perf", {
      businessFunction: "hr",
      useCasePatterns: ["performance_management"],
      dataCategories: ["employee_hr"],
      affectedPeople: ["employees_applicants"],
    });
    expect(triggeredIds(c)).toContain("BC-PIPA-MON");
  });

  it("BC-GOV-GENAI: tool type unset → info 'confirm the tool'", () => {
    const t = run(EDGE.ministryToolUnset).triggeredRules.find((x) => x.ruleId === "BC-GOV-GENAI");
    expect(t?.severity).toBe("info");
    expect(t?.notes.join(" ")).toContain("Confirm the tool is an approved enterprise tool");
  });

  it("BC-GOV-GENAI excludes health authorities", () => {
    const c = makeCase("ha", { orgType: "bc_health_authority", sector: "government_ministry", aiType: "generative_llm", genAiToolType: "public_tool" });
    expect(triggeredIds(c)).not.toContain("BC-GOV-GENAI");
  });

  it("INS-FAIR is a reference framework at info for a Crown insurer", () => {
    const t = run(claims).triggeredRules.find((x) => x.ruleId === "INS-FAIR");
    expect(t?.effectiveStatus).toBe("REFERENCE");
    expect(t?.severity).toBe("info");
    expect(t?.inScope).toBe(false);
  });

  it("BC-HRC-01 does not apply to federal banks or federal institutions (ADR-0015)", () => {
    const c = makeCase("frfi bank", {
      orgType: "federally_regulated_fi",
      sector: "financial_services",
      useCasePatterns: ["hiring_selection"],
    });
    expect(triggeredIds(c)).not.toContain("BC-HRC-01");
    expect(triggeredIds(EDGE.federalAdminDecision)).not.toContain("BC-HRC-01");
  });
});
