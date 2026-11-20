/**
 * Federal rules. Status per docs/research/01_* §2; predicates per ADR-0012 where it settles them.
 */
import { tierRank } from "@/engine/tier";
import type { CaseFacts, RuleDefinition } from "@/engine/types";
import { LAST_VERIFIED, SRC } from "./sources";

/** Personal information other than employee information. */
const nonEmployeePersonalData = (c: CaseFacts): boolean =>
  c.dataCategories.some((d) => d !== "no_personal" && d !== "employee_hr");

export const FEDERAL_RULES: RuleDefinition[] = [
  {
    id: "FED-PIPEDA-XB",
    title: "PIPEDA: accountability for personal information sent to a processor",
    jurisdiction: "federal",
    instrument: "PIPEDA (accountability for transfers for processing)",
    status: "IN_FORCE",
    reads: ["orgType", "dataCategories", "hosting"],
    // Employee-only data of a provincially regulated employer falls under BC PIPA, not PIPEDA (ADR-0015).
    appliesWhen: (c) => c.privateSector && (c.frfi ? c.personalData : nonEmployeePersonalData(c)) && c.crossBorder,
    severity: () => "action",
    consideration:
      "Personal information would leave the province or Canada in the course of commercial activity, so PIPEDA likely applies. The organization stays accountable for information it transfers to a third party for processing.",
    actionsToConsider: [
      "Put contractual protections in place with the AI vendor: use limits, security, retention and sub-processors.",
      "Carry out vendor due diligence before procurement.",
      "Tell individuals that their information may be processed outside Canada.",
    ],
    sources: [SRC.opcVendorNews, SRC.jointOpenAi, SRC.kukiePipeda, SRC.claudeResidency],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "FED-OPC-VENDOR",
    title: "Due diligence on third-party AI vendors",
    jurisdiction: "federal",
    instrument: "OPC draft guidance on assessing third-party service providers (Sept 10, 2026)",
    status: "REGULATOR_GUIDANCE",
    // Draft until the OPC finalizes it; re-check after the consultation (research §4 item 3).
    draft: { consultationEnds: "2026-12-04" },
    statusWhenOutOfScope: "REFERENCE",
    scopeLabel: "private-sector organizations",
    reads: ["orgType", "hosting", "teamSetup", "aiType"],
    inScope: (c) => c.privateSector,
    appliesWhen: (c) => c.crossBorder || c.teamSetup === "vendor_run" || c.aiType === "generative_llm",
    severity: () => "action",
    consideration:
      "OPC draft guidance asks organizations to assess third-party vendors before procurement, including where an AI vendor's training data came from and whether it was collected lawfully.",
    notes: (c) =>
      c.privateSector
        ? []
        : ["Written for private-sector organizations under PIPEDA; used here as a reference for vendor due diligence under FIPPA s. 30."],
    actionsToConsider: [
      "Assess the vendor before procurement: data use, retention, zero-data-retention options, sub-processors and region.",
      "Ask where the model's training data came from and whether it was collected lawfully.",
      "Re-check this guidance once the OPC publishes the final version.",
    ],
    sources: [SRC.opcVendorNews, SRC.iappVendor],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "FED-C36-ADM",
    title: "Bill C-36: explanation and review of automated decisions (proposed)",
    jurisdiction: "federal",
    instrument: "Bill C-36, Protecting Privacy and Consumer Data Act, s. 63 (proposed)",
    status: "PROPOSED",
    reads: ["orgType", "affectedPeople", "consequential"],
    // ADR-0012: federally regulated organizations, or commercial activity about customers or the public,
    // with a consequential subtask. Not for a provincial employer's own staff.
    appliesWhen: (c) =>
      c.consequentialPresent &&
      (c.frfi ||
        (c.privateSector && (c.affectedPeople.includes("public_customers") || c.affectedPeople.includes("patients")))),
    severity: () => "info",
    consideration:
      "Bill C-36 would let individuals ask for an explanation of automated predictions, recommendations or decisions with a legal or similarly significant effect, and make representations to someone who can review them. It is a bill, not law; PIPEDA still governs.",
    actionsToConsider: [
      "Prepare to explain the personal information used, its source and the main factors behind a decision.",
      "Prepare a channel for a person to review a decision on request.",
    ],
    sources: [SRC.gowlingC36, SRC.oslerC36, SRC.kukiePipeda],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "FED-C36-XB",
    title: "Bill C-36: assessment before transfers outside Canada (proposed)",
    jurisdiction: "federal",
    instrument: "Bill C-36, Protecting Privacy and Consumer Data Act, s. 57 (proposed)",
    status: "PROPOSED",
    reads: ["orgType", "dataCategories", "hosting"],
    // Employee-only data of a provincially regulated employer falls under BC PIPA, not PIPEDA (ADR-0015).
    appliesWhen: (c) => c.privateSector && (c.frfi ? c.personalData : nonEmployeePersonalData(c)) && c.crossBorder,
    severity: () => "info",
    consideration:
      "Bill C-36 would call for a privacy impact assessment and mitigation measures before personal information is transferred outside Canada. It is a bill, not law; PIPEDA still governs.",
    actionsToConsider: [
      "Prepare a pre-transfer privacy impact assessment with mitigation measures that could be shown to the regulator on request.",
    ],
    sources: [SRC.dlaC36, SRC.oslerC36],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "FED-DADM-01",
    title: "Directive on Automated Decision-Making: official AIA and peer review",
    jurisdiction: "federal",
    instrument: "Treasury Board Directive on Automated Decision-Making (4th review, 2025)",
    status: "GOVERNMENT_POLICY",
    statusWhenOutOfScope: "REFERENCE",
    scopeLabel: "federal institutions",
    reads: ["orgType", "useCasePatterns"],
    inScope: (c) => c.federalInstitution,
    appliesWhen: (c) => c.useCasePatterns.includes("administrative_decision"),
    severity: () => "action",
    consideration:
      "The Directive applies to federal institutions using automated systems that make or support administrative decisions about clients. Elsewhere it is a useful reference framework.",
    actionsToConsider: [
      "Complete the official Algorithmic Impact Assessment before production.",
      "Arrange peer review if the official AIA returns impact level II or higher.",
      "Plan notice and explanation for the people affected.",
    ],
    sources: [SRC.tbsDadm, SRC.aiaTool, SRC.peerReview],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "FED-DADM-HITL",
    title: "Human intervention points and a human final decision at higher impact",
    jurisdiction: "federal",
    instrument: "Directive on Automated Decision-Making, Appendix C",
    status: "GOVERNMENT_POLICY",
    statusWhenOutOfScope: "REFERENCE",
    scopeLabel: "federal institutions",
    reads: ["indicativeTier", "orgType"],
    inScope: (c) => c.federalInstitution,
    appliesWhen: (c) => tierRank(c.indicativeTier) >= 3,
    // ADR-0012: capped at action even in scope, so the official AIA (FED-DADM-01) decides, not the indicative tier.
    severity: () => "action",
    consideration:
      "DADM Appendix C calls for human intervention points and a human final decision at impact levels III and IV. Splitline's indicative tier is not the official AIA level.",
    notes: (c) =>
      c.federalInstitution
        ? ["If your official AIA returns Level III or IV, the Directive requires human intervention points and a human final decision."]
        : [
            "Reference: DADM Appendix C (mandatory for federal institutions only). Splitline uses a human final decision as its design setting at this indicative tier.",
          ],
    actionsToConsider: ["Define human intervention points in the workflow.", "Keep the final decision with a person."],
    sources: [SRC.dadmArchived, SRC.autanaDadm],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "REF-AIA-TIER",
    title: "AIA-inspired indicative tier",
    jurisdiction: "federal",
    instrument: "Algorithmic Impact Assessment (DADM), levels and thresholds used as a reference",
    status: "REFERENCE",
    reads: ["indicativeTier"],
    appliesWhen: () => true,
    severity: () => "info",
    consideration:
      "The AIA-inspired indicative tier reuses the federal AIA's four levels and percentage thresholds as a reference. It is not an official Algorithmic Impact Assessment.",
    actionsToConsider: ["Use the indicative tier to scope the depth of review, not as an official impact level."],
    sources: [SRC.aiaTool, SRC.tbsDadm],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "OSFI-E23",
    title: "OSFI Guideline E-23: model risk management",
    jurisdiction: "federal",
    instrument: "OSFI Guideline E-23 Model Risk Management (2027)",
    status: "IN_FORCE_FUTURE",
    effectiveDate: "2027-05-01",
    reads: ["orgType", "aiType"],
    appliesWhen: (c) => c.frfi,
    severity: () => "action",
    consideration:
      "From May 1, 2027, OSFI's E-23 guideline applies to federally regulated financial institutions and covers AI and machine-learning models. It expects an enterprise model inventory, risk-based proportionality and third-party model management.",
    actionsToConsider: [
      "Add the model to the enterprise model inventory with a risk rating.",
      "Plan validation proportional to the model's risk.",
      "Manage a third-party model together with Guideline B-10.",
    ],
    sources: [SRC.osfiE23],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "INS-OSFI-GENAI",
    title: "OSFI sound practices for generative and agentic AI",
    jurisdiction: "federal",
    instrument: "OSFI bulletin on generative and agentic AI (July 2026)",
    status: "REGULATOR_GUIDANCE",
    reads: ["orgType", "aiType"],
    appliesWhen: (c) => c.frfi && c.aiType === "generative_llm",
    severity: () => "action",
    consideration:
      "OSFI's July 2026 bulletin sets out sound practices for generative and agentic AI at federally regulated institutions, including insurers.",
    actionsToConsider: [
      "Map the use case against the bulletin's sound practices.",
      "Link the controls to your E-23 model risk framework.",
    ],
    sources: [SRC.osfiGenAi, SRC.osfiE23],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "VC-GENAI-MGR",
    title: "Voluntary Code on advanced generative AI: manager role",
    jurisdiction: "federal",
    instrument: "Voluntary Code of Conduct on the Responsible Development and Management of Advanced Generative AI Systems (ISED, 2023)",
    status: "VOLUNTARY",
    reads: ["aiType"],
    appliesWhen: (c) => c.aiType === "generative_llm",
    severity: () => "info",
    consideration:
      "An organization deploying an advanced generative AI system is a 'manager' under the voluntary code. Its six principles make a useful checklist.",
    actionsToConsider: [
      "Review the six principles for the manager role: accountability, safety, fairness and equity, transparency, human oversight and monitoring, validity and robustness.",
    ],
    sources: [SRC.isedCode],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "HC-SAMD-01",
    title: "Software as a Medical Device classification check",
    jurisdiction: "federal",
    instrument: "Medical Devices Regulations; Health Canada SaMD guidance (2019)",
    status: "IN_FORCE",
    reads: ["useCasePatterns", "sector", "dataCategories"],
    appliesWhen: (c) => c.useCasePatterns.includes("clinical_triage"),
    severity: () => "action",
    consideration:
      "Software that prioritizes, triages or recommends clinical action may be a medical device. Check it against Health Canada's four exclusion criteria for clinical decision support.",
    actionsToConsider: [
      "Check all four exclusion criteria: no medical images or signals; displays or analyzes patient information; only supports decisions; the professional can review the basis independently.",
      "If any criterion is not met, assess the device class and licensing path before use.",
    ],
    sources: [SRC.hcSamd, SRC.hcSamdExamples, SRC.blgMlmd],
    lastVerified: LAST_VERIFIED,
  },
];
