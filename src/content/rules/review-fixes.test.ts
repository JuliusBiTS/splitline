/** Predicate refinements from the Phase 1 legal review (ADR-0015). */
import { describe, expect, it } from "vitest";
import { makeCase, triggeredIds } from "../../../tests/fixtures/cases";

describe("ADR-0015 predicate refinements", () => {
  const staffAbroad = makeCase("BC employer, staff data, US API", {
    businessFunction: "operations",
    dataCategories: ["employee_hr"],
    affectedPeople: ["employees_applicants"],
    hosting: "us_or_global_api",
  });

  it("PIPEDA and C-36 transfer rules do not apply to a provincial employer's own staff data", () => {
    const ids = triggeredIds(staffAbroad);
    expect(ids).not.toContain("FED-PIPEDA-XB");
    expect(ids).not.toContain("FED-C36-XB");
  });

  it("they still apply to a federally regulated employer's staff data", () => {
    const ids = triggeredIds(makeCase("FRFI staff", { ...staffAbroad.intake, orgType: "federally_regulated_fi" }));
    expect(ids).toContain("FED-PIPEDA-XB");
  });

  it("BC-PIPA-EMP covers employee data outside HR and hiring (no BC PIPA gap)", () => {
    expect(triggeredIds(staffAbroad)).toContain("BC-PIPA-EMP");
  });

  it("BC-HRC-01 applies to a federally regulated insurer in BC but not to a federal bank", () => {
    const base = { orgType: "federally_regulated_fi" as const, useCasePatterns: ["hiring_selection" as const] };
    expect(triggeredIds(makeCase("FRFI insurer", { ...base, sector: "insurance" }))).toContain("BC-HRC-01");
    expect(triggeredIds(makeCase("FRFI bank", { ...base, sector: "financial_services" }))).not.toContain("BC-HRC-01");
  });

  it("QC-AMF-AI does not apply to a federal bank; it does to a federally regulated insurer", () => {
    const q = { orgType: "federally_regulated_fi" as const, jurisdictions: ["quebec" as const] };
    expect(triggeredIds(makeCase("bank", { ...q, sector: "financial_services" }))).not.toContain("QC-AMF-AI");
    expect(triggeredIds(makeCase("insurer", { ...q, sector: "insurance" }))).toContain("QC-AMF-AI");
  });

  it("QC-L25-121 (private-sector Act) does not apply to a BC public body", () => {
    const c = makeCase("crown, Quebec residents", {
      orgType: "bc_crown_corp",
      jurisdictions: ["bc", "quebec"],
      aiDecisionRole: "decides_alone",
      dataCategories: ["customer_pi"],
    });
    expect(triggeredIds(c)).not.toContain("QC-L25-121");
  });
});
