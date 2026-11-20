/** Quebec rules. Status per docs/research/01_* §2.8 and §2.12; QC-L25-121 predicate per ADR-0012. */
import type { RuleDefinition } from "@/engine/types";
import { LAST_VERIFIED, SRC } from "./sources";

export const QC_RULES: RuleDefinition[] = [
  {
    id: "QC-L25-121",
    title: "Quebec Law 25: decisions based exclusively on automated processing",
    jurisdiction: "qc",
    instrument: "Quebec Law 25, Act respecting the protection of personal information in the private sector, s. 12.1",
    status: "IN_FORCE",
    reads: ["jurisdictions", "dataCategories", "aiDecisionRole", "mitigations"],
    appliesWhen: (c) =>
      c.privateSector &&
      c.jurisdictions.includes("quebec") &&
      c.personalData &&
      (c.aiDecisionRole === "decides_alone" ||
        (c.aiDecisionRole === "decides_with_review" && !c.mitigations.includes("human_final_decision"))),
    severity: (c) => (c.aiDecisionRole === "decides_alone" ? "action" : "info"),
    consideration:
      "For a decision based exclusively on automated processing of personal information, s. 12.1 calls for informing the person, explaining the information and principal factors on request, and offering review by a person. Meaningful human review takes a decision out of scope.",
    notes: (c) =>
      c.aiDecisionRole === "decides_with_review"
        ? ["Ensure the human review is meaningful; a pro-forma sign-off likely does not take the decision out of s. 12.1."]
        : [],
    actionsToConsider: [
      "Inform the person no later than when the decision is communicated.",
      "Prepare to explain, on request, the personal information used, the reasons and the principal factors.",
      "Offer correction and a route to submit observations to a person who can review the decision.",
    ],
    sources: [SRC.law25],
    lastVerified: LAST_VERIFIED,
  },
  {
    id: "QC-AMF-AI",
    title: "AMF guideline on the use of AI",
    jurisdiction: "qc",
    instrument: "AMF Guideline for the Use of Artificial Intelligence",
    status: "IN_FORCE_FUTURE",
    effectiveDate: "2027-05-01",
    reads: ["sector", "jurisdictions", "orgType"],
    appliesWhen: (c) =>
      // Federally regulated banks are not AMF-supervised (ADR-0015).
      (c.sector === "financial_services" || c.sector === "insurance") &&
      c.jurisdictions.includes("quebec") &&
      c.privateSector &&
      !(c.frfi && c.sector === "financial_services"),
    severity: () => "action",
    consideration:
      "From May 1, 2027, the AMF guideline sets expectations on AI governance, explainability and fair treatment of clients for Quebec-regulated financial institutions.",
    notes: () => ["This likely applies if your institution is supervised by the AMF; confirm your regulatory status."],
    actionsToConsider: [
      "Confirm whether your institution is regulated by the AMF.",
      "If so, plan AI governance, explainability and fair-treatment controls before May 1, 2027.",
    ],
    sources: [SRC.amfAi],
    lastVerified: LAST_VERIFIED,
  },
];
