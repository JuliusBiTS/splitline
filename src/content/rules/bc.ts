/**
 * British Columbia rules. Status per docs/research/01_* §2; predicates per ADR-0012 where it
 * settles them (it supersedes research §3 for triggers until the research file is synced).
 */
import type { CaseFacts, RuleDefinition, UseCasePattern } from "@/engine/types";
import { LAST_VERIFIED, SRC } from "./sources";

const has = (c: CaseFacts, p: UseCasePattern): boolean => c.useCasePatterns.includes(p);

export const BC_RULES: RuleDefinition[] = [
  {
    id: "BC-PIPA-01",
    title: "BC PIPA: reasonable purpose and a valid form of consent",
    jurisdiction: "bc",
    instrument: "BC Personal Information Protection Act (PIPA)",
    status: "IN_FORCE",
    reads: ["orgType", "jurisdictions", "dataCategories"],
    // Employee-only data is handled by BC-PIPA-EMP (its own consent regime).
    appliesWhen: (c) => c.bcPipaOrg && c.dataCategories.some((d) => d !== "no_personal" && d !== "employee_hr"),
    severity: () => "action",
    consideration:
      "BC PIPA likely applies to this use of personal information. Collection, use and disclosure need a reasonable purpose and a valid form of consent, and OIPC BC has found there is no implied consent under PIPA.",
    actionsToConsider: [
      "Document the purpose of each use of personal information, including the AI use.",
      "Choose and record the consent form for each purpose: express, deemed or notice-based (opt-out).",
      "Update privacy notices to describe the AI use.",
    ],
    sources: [SRC.oipcGuidance, SRC.jointOpenAi],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-PIPA-EMP",
    title: "BC PIPA: employee personal information",
    jurisdiction: "bc",
    instrument: "BC PIPA, employee personal information provisions (ss. 13, 16, 19; section numbers pending verification)",
    status: "IN_FORCE",
    reads: ["orgType", "dataCategories", "businessFunction", "useCasePatterns"],
    appliesWhen: (c) =>
      c.bcPipaOrg &&
      c.dataCategories.includes("employee_hr") &&
      (c.businessFunction === "hr" || has(c, "hiring_selection") || has(c, "performance_management")),
    severity: () => "action",
    consideration:
      "Employee personal information may be collected, used or disclosed without consent if that is reasonable for establishing, managing or ending the employment relationship and the employee is notified. If the information is not collected solely for that purpose, the normal consent rules likely apply.",
    actionsToConsider: [
      "Notify employees and applicants before their information is used for this purpose.",
      "Document why this information is reasonable for managing the employment relationship (proportionality).",
      "Separate any mixed purpose, such as monitoring, and assess it under the normal consent rules.",
    ],
    sources: [SRC.oipcMonitoring, SRC.p1701],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-PIPA-MON",
    title: "Employee monitoring and productivity or sentiment scoring",
    jurisdiction: "bc",
    instrument: "OIPC BC guidance on employee monitoring (BC PIPA)",
    status: "REGULATOR_GUIDANCE",
    reads: ["orgType", "jurisdictions", "monitorsEmployees", "businessFunction", "useCasePatterns"],
    appliesWhen: (c) =>
      c.bcPipaOrg && (c.monitorsEmployees || (c.businessFunction === "hr" && has(c, "performance_management"))),
    severity: () => "blocker",
    redesignPath:
      "Replace ongoing, routine monitoring with a narrow, overt and time-limited measure that has a documented purpose, or drop the productivity or sentiment scoring.",
    consideration:
      "OIPC BC considers ongoing, continuous and routine monitoring of employee behaviour seldom authorized, and covert monitoring faces a very high bar. Off-the-shelf tools with default settings are not automatically acceptable.",
    actionsToConsider: [
      "Redesign: remove continuous or covert monitoring and limit any measurement to a specific, documented and overt purpose.",
      "Assess whether a less intrusive alternative achieves the same purpose.",
      "Notify employees of any remaining measurement and review the vendor's default settings.",
    ],
    sources: [SRC.oipcMonitoring, SRC.p1701],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-FIPPA-01",
    title: "BC FIPPA: privacy impact assessment and reasonable security",
    jurisdiction: "bc",
    instrument: "BC FIPPA (Ministerial PIA directions; s. 30 reasonable security)",
    status: "IN_FORCE",
    reads: ["orgType"],
    appliesWhen: (c) => c.bcPublicBody,
    severity: () => "action",
    consideration:
      "As a BC public body, a new initiative like this likely needs a privacy impact assessment under FIPPA. Section 30 calls for reasonable security arrangements for personal information.",
    actionsToConsider: [
      "Complete or update a privacy impact assessment before launch.",
      "Document the reasonable security arrangements (FIPPA s. 30) for the AI system and its vendors.",
      "Check the initiative against your privacy management program.",
    ],
    sources: [SRC.fippaXbGuidance, SRC.oipcS30],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-FIPPA-XB",
    title: "BC FIPPA: personal information stored or processed outside Canada",
    jurisdiction: "bc",
    instrument: "BC FIPPA s. 33.1 + B.C. Reg. 294/2021; s. 30",
    status: "IN_FORCE",
    reads: ["orgType", "dataCategories", "hosting"],
    appliesWhen: (c) => c.bcPublicBody && c.personalData && c.crossBorder,
    // ADR-0007 §4: likely sensitive categories → action; other personal categories → info ("assess").
    severity: (c) => (c.sensitiveCategories.length > 0 ? "action" : "info"),
    consideration:
      "Personal information would be disclosed to be stored or processed outside Canada. Under B.C. Reg. 294/2021, sensitive personal information stored outside Canada needs a supplementary assessment and a risk-based decision by the head of the public body.",
    notes: (c) =>
      c.sensitiveCategories.length > 0
        ? [
            "Health, biometric, children's or financial information is likely sensitive (Splitline heuristic; the regulation does not list categories).",
          ]
        : [
            "Assess whether this information is sensitive (B.C. Reg. 294/2021 does not define it). If it is, a supplementary assessment (PIA Part 4) and a risk-based decision by the head of the public body are needed.",
          ],
    actionsToConsider: ["Assess the foreign legal framework and reasonable security (FIPPA s. 30)."],
    extraActions: (c) =>
      c.sensitiveCategories.length > 0
        ? [
            "Prepare a supplementary assessment (PIA Part 4) for storage outside Canada.",
            "Record the risk-based decision by the head of the public body.",
          ]
        : [],
    sources: [SRC.fippa331, SRC.fippaXbGuidance, SRC.oipcS30, SRC.claudeResidency],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-GOV-GENAI",
    title: "BC Public Service generative AI policy",
    jurisdiction: "bc",
    instrument: "BC Public Service generative AI policy",
    status: "GOVERNMENT_POLICY",
    scopeLabel: "the BC Public Service",
    reads: ["orgType", "sector", "aiType", "genAiToolType", "dataCategories"],
    // Ministries only; health authorities have their own policies (ADR-0012).
    appliesWhen: (c) =>
      c.orgType === "bc_public_body" &&
      c.sector === "government_ministry" &&
      c.aiType === "generative_llm" &&
      (c.genAiToolType === "public_tool" || c.genAiToolType === undefined),
    severity: (c) => {
      if (c.genAiToolType === undefined) return "info";
      return c.personalData ? "blocker" : "action";
    },
    redesignPath:
      "Move the use case to an approved enterprise generative AI tool, or keep personal and confidential information out of it.",
    consideration:
      "The BC Public Service generative AI policy allows confidential or personal information only in approved enterprise tools, never in public generative AI tools.",
    notes: (c) =>
      c.genAiToolType === undefined
        ? ["Confirm the tool is an approved enterprise tool; the policy does not allow personal or confidential information in public generative AI tools."]
        : [],
    actionsToConsider: [
      "Use an approved enterprise tool for any confidential or personal information.",
      "Keep confidential and personal information out of public generative AI tools.",
    ],
    sources: [SRC.bcGenAiPolicy],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-HRC-01",
    title: "BC Human Rights Code: algorithmic decisions about people",
    jurisdiction: "bc",
    instrument: "BC Human Rights Code",
    status: "IN_FORCE",
    reads: ["orgType", "jurisdictions", "useCasePatterns"],
    // ADR-0012: BC connection AND hiring / performance / claims eligibility / eligibility-type admin decision.
    // Federal institutions and federally regulated FIs fall under the Canadian Human Rights Act instead.
    appliesWhen: (c) =>
      c.bcConnected &&
      !c.federalInstitution &&
      !c.frfi &&
      (has(c, "hiring_selection") ||
        has(c, "performance_management") ||
        has(c, "claims_eligibility") ||
        has(c, "administrative_decision")),
    severity: () => "action",
    consideration:
      "Discriminatory outcomes of algorithmic hiring, performance or eligibility decisions are actionable under the BC Human Rights Code, even without an AI statute.",
    actionsToConsider: [
      "Test for adverse impact on protected groups before launch and at regular intervals.",
      "Document the rationale for each decision the AI supports.",
      "Give people a route to raise a concern about an outcome.",
    ],
    sources: [SRC.bcHumanRights],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "BC-OIPC-SCRIBE",
    title: "AI scribes in clinical settings",
    jurisdiction: "bc",
    instrument: "OIPC BC guidance on AI scribes (Jan 28, 2026)",
    status: "REGULATOR_GUIDANCE",
    reads: ["useCasePatterns", "orgType", "sector", "dataCategories"],
    appliesWhen: (c) =>
      c.bcConnected &&
      has(c, "ambient_scribe") &&
      (c.dataCategories.includes("health") || c.sector === "health_care" || c.orgType === "bc_health_authority"),
    severity: () => "action",
    consideration:
      "OIPC BC expects consent in almost all clinical situations before an AI scribe records, and human review of AI-generated notes. The guidance also covers staff information the scribe captures.",
    actionsToConsider: [
      "Plan how to obtain and record patient consent before recording.",
      "Have a clinician review every AI-generated note before it enters the record.",
      "Assess the employee personal information the scribe captures.",
    ],
    sources: [SRC.oipcScribes],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "INS-FAIR",
    title: "Fair treatment of insurance customers",
    jurisdiction: "bc",
    instrument: "BCFSA Insurer Code of Market Conduct",
    status: "REGULATOR_GUIDANCE",
    statusWhenOutOfScope: "REFERENCE",
    scopeLabel: "BC-authorized private insurers",
    reads: ["sector", "orgType", "useCasePatterns", "customerFacingOutput", "affectedPeople"],
    // ADR-0012: guidance for BC-authorized private insurers; REFERENCE for Crown insurers.
    inScope: (c) => c.privateSector,
    appliesWhen: (c) =>
      c.bcConnected &&
      c.sector === "insurance" &&
      (has(c, "claims_eligibility") || c.customerFacingOutput || c.affectedPeople.includes("public_customers")),
    severity: () => "action",
    consideration:
      "The BCFSA Insurer Code of Market Conduct sets fair-treatment principles that BC-authorized insurers are expected to apply, including in claims.",
    notes: (c) =>
      c.privateSector
        ? []
        : ["Your organization is a public insurer outside the Code's scope; the Code is used here as a reference framework."],
    actionsToConsider: [
      "Review AI-assisted claims outcomes for fair treatment of customers.",
      "Prepare plain-language explanations for customers about how AI is used in their claim.",
      "Keep a clear complaint path to a person.",
    ],
    sources: [SRC.bcfsaRoadmap, SRC.torysInsurance],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "LIAB-CUSTFACING",
    title: "Responsibility for customer-facing AI output",
    jurisdiction: "bc",
    instrument: "Moffatt v. Air Canada (BC Civil Resolution Tribunal, 2024)",
    status: "REFERENCE",
    reads: ["customerFacingOutput", "aiType", "useCasePatterns"],
    // ADR-0012: customerFacingOutput AND generative; the customer_chatbot pattern is not required.
    appliesWhen: (c) => c.customerFacingOutput && c.aiType === "generative_llm",
    severity: () => "action",
    consideration:
      "A BC tribunal held a company responsible for a misstatement by its customer-facing chatbot. Disclaimers alone are unlikely to shift that responsibility.",
    actionsToConsider: [
      "Put accuracy controls on customer-facing output (grounding, testing, monitoring).",
      "Offer a clear escalation path to a person.",
      "Treat chatbot statements as the organization's own statements.",
    ],
    sources: [SRC.torysInsurance],
    lastVerified: LAST_VERIFIED,
  },
];
