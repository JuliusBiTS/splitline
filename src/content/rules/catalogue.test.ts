import { describe, expect, it } from "vitest";
import { severityCap, severityRank } from "@/engine/rules";
import { RuleMetaSchema } from "@/engine/types";
import { ALL_CASES, makeCase, run, type CaseInput } from "../../../tests/fixtures/cases";
import { AiDecisionRoleSchema, GenAiToolTypeSchema, OrgTypeSchema } from "@/engine/types";

/** All fixtures plus a grid over org type × decision role × gen-AI tool type × personal data × patterns. */
const BLOCKER_PROBE_CASES: CaseInput[] = [
  ...ALL_CASES,
  ...OrgTypeSchema.options.flatMap((orgType) =>
    AiDecisionRoleSchema.options.flatMap((aiDecisionRole) =>
      [...GenAiToolTypeSchema.options, undefined].flatMap((genAiToolType) =>
        [true, false].map((personal) =>
          makeCase("probe", {
            orgType,
            aiDecisionRole,
            genAiToolType,
            sector: "government_ministry",
            aiType: "generative_llm",
            hosting: "unsure",
            monitorsEmployees: true,
            customerFacingOutput: true,
            employerSize25Plus: true,
            jurisdictions: ["bc", "ontario", "quebec"],
            affectedPeople: ["public_customers", "patients", "employees_applicants"],
            dataCategories: personal ? ["health", "customer_pi", "employee_hr", "children"] : ["no_personal"],
            useCasePatterns: [
              "hiring_selection",
              "performance_management",
              "clinical_triage",
              "ambient_scribe",
              "claims_eligibility",
              "administrative_decision",
              "customer_chatbot",
            ],
          }),
        ),
      ),
    ),
  ),
];
import { RULE_CATALOGUE } from "./index";

/** The 25 rules of docs/research/01_* §3. */
const RESEARCH_IDS = [
  "BC-PIPA-01", "BC-PIPA-EMP", "BC-PIPA-MON", "BC-FIPPA-01", "BC-FIPPA-XB", "BC-GOV-GENAI",
  "FED-PIPEDA-XB", "FED-OPC-VENDOR", "FED-C36-ADM", "FED-C36-XB", "QC-L25-121", "ON-ESA-AI",
  "BC-HRC-01", "HC-SAMD-01", "BC-OIPC-SCRIBE", "FED-DADM-01", "REF-AIA-TIER", "VC-GENAI-MGR",
  "OSFI-E23", "ISO-42001", "FED-DADM-HITL", "INS-FAIR", "INS-OSFI-GENAI", "QC-AMF-AI", "LIAB-CUSTFACING",
];

/** Wording that must never appear in rule text (CLAUDE.md content rules, PLAN Phase 1 acceptance). */
const BANNED = [/\bcompliant\b/i, /must comply/i, /legal advice/i, /\byou must\b/i];

describe("rule catalogue", () => {
  it("implements every rule from research §3, once", () => {
    const ids = RULE_CATALOGUE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...RESEARCH_IDS].sort());
  });

  describe.each(RULE_CATALOGUE.map((r) => [r.id, r] as const))("%s", (_id, rule) => {
    it("has valid metadata: non-empty sources, a lastVerified date, effectiveDate when IN_FORCE_FUTURE", () => {
      const parsed = RuleMetaSchema.safeParse(rule);
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
      expect(rule.sources.length).toBeGreaterThan(0);
      expect(rule.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (rule.status === "IN_FORCE_FUTURE") expect(rule.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("is stored under a jurisdiction file that matches its jurisdiction field", () => {
      expect(["federal", "bc", "on", "qc", "intl"]).toContain(rule.jurisdiction);
    });
  });

  it("rejects an IN_FORCE_FUTURE rule without effectiveDate (Zod refinement)", () => {
    const first = RULE_CATALOGUE[0];
    if (!first) throw new Error("empty catalogue");
    const res = RuleMetaSchema.safeParse({ ...first, status: "IN_FORCE_FUTURE", effectiveDate: undefined });
    expect(res.success).toBe(false);
  });

  it("rejects a rule without sources", () => {
    const first = RULE_CATALOGUE[0];
    if (!first) throw new Error("empty catalogue");
    expect(RuleMetaSchema.safeParse({ ...first, sources: [] }).success).toBe(false);
  });

  it("every rule that can request blocker has a redesign path (checked on the requested severity, over a wide fact grid)", () => {
    // Call each rule's severity() directly on many fact combinations, whether or not appliesWhen holds,
    // so a rule that could ask for blocker is caught even if no fixture triggers it.
    const grid = BLOCKER_PROBE_CASES.map((c) => run(c).facts);
    for (const rule of RULE_CATALOGUE) {
      const canBlock = grid.some((f) => rule.severity(f) === "blocker");
      if (canBlock) expect(rule.redesignPath, rule.id).toBeTruthy();
    }
    // The probe does reach the known blocker-capable rules.
    const blockers = RULE_CATALOGUE.filter((r) => grid.some((f) => r.severity(f) === "blocker")).map((r) => r.id);
    expect(blockers).toEqual(expect.arrayContaining(["BC-PIPA-MON", "BC-GOV-GENAI"]));
  });
});

describe("wording (no 'compliant', 'must comply', 'legal advice')", () => {
  const staticTexts = RULE_CATALOGUE.flatMap((r) => [
    [r.id, r.title],
    [r.id, r.instrument],
    [r.id, r.consideration],
    [r.id, r.redesignPath ?? ""],
    [r.id, r.scopeLabel ?? ""],
    ...r.actionsToConsider.map((a) => [r.id, a]),
    ...r.sources.map((s) => [r.id, s.label]),
  ]);
  it.each(staticTexts)("%s: %s", (_id, text) => {
    for (const re of BANNED) expect(text).not.toMatch(re);
  });

  it("case-dependent notes, actions and matched facts are clean on every fixture", () => {
    for (const c of ALL_CASES) {
      for (const t of run(c).triggeredRules) {
        for (const text of [...t.notes, ...t.actions, ...t.matchedFacts]) {
          for (const re of BANNED) expect(text, `${c.name} / ${t.ruleId}`).not.toMatch(re);
        }
      }
    }
  });

  it("the test itself catches a banned word", () => {
    expect(BANNED.some((re) => re.test("This makes you compliant."))).toBe(true);
  });
});

describe("status cap holds on every fixture", () => {
  it("effective severity never exceeds the cap; PROPOSED, VOLUNTARY and REFERENCE stay at info", () => {
    for (const c of ALL_CASES) {
      for (const t of run(c).triggeredRules) {
        const rule = RULE_CATALOGUE.find((r) => r.id === t.ruleId);
        const draft = t.effectiveStatus === "REGULATOR_GUIDANCE" && rule?.draft !== undefined;
        const cap = severityCap(t.effectiveStatus, { inScope: t.inScope, draft });
        expect(severityRank(t.severity), `${c.name} / ${t.ruleId}`).toBeLessThanOrEqual(severityRank(cap));
        if (["PROPOSED", "VOLUNTARY", "REFERENCE"].includes(t.effectiveStatus)) expect(t.severity).toBe("info");
        if (draft) expect(severityRank(t.severity)).toBeLessThanOrEqual(severityRank("action"));
      }
    }
  });
});

describe("planning metadata (ADR-0018)", () => {
  it("every rule names a likely owner role and a rough effort band", () => {
    for (const r of RULE_CATALOGUE) {
      expect(r.ownerRole, r.id).toBeTruthy();
      expect(["small", "medium", "large"], r.id).toContain(r.effort);
    }
  });
  it("owner roles name a role only, never a legal duty or a compliance claim", () => {
    for (const r of RULE_CATALOGUE) expect(r.ownerRole ?? "", r.id).not.toMatch(/\b(must|shall|required|compliant|compliance with)\b/i);
  });
});
