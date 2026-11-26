/** Ontario rules. Status per docs/research/01_* §2.8; predicate per ADR-0012. */
import type { RuleDefinition } from "@/engine/types";
import { LAST_VERIFIED, SRC } from "./sources";

export const ON_RULES: RuleDefinition[] = [
  {
    id: "ON-ESA-AI",
    title: "Ontario: AI disclosure in job postings",
    jurisdiction: "on",
    instrument: "Ontario Employment Standards Act (Working for Workers Four Act; O. Reg. 476/24)",
    status: "IN_FORCE",
    reads: ["useCasePatterns", "jurisdictions", "employerSize25Plus"],
    appliesWhen: (c) =>
      c.useCasePatterns.includes("hiring_selection") && c.jurisdictions.includes("ontario") && c.employerSize25Plus !== false,
    // Headcount unset → info until confirmed (ADR-0012).
    severity: (c) => (c.employerSize25Plus === true ? "action" : "info"),
    consideration:
      "Since January 1, 2026, Ontario employers with 25 or more employees disclose in publicly advertised job postings, and the application form, if AI is used to screen, assess or select applicants.",
    notes: (c) =>
      c.employerSize25Plus === undefined
        ? ["Confirm headcount (≥ 25 employees triggers the Ontario posting disclosure)."]
        : [],
    actionsToConsider: [
      "Add an AI-use disclosure to publicly advertised postings for Ontario roles and to the application form.",
      "Remove any 'Canadian experience' requirement from those postings.",
    ],
    ownerRole: "HR, with the hiring manager",
    effort: "small",
    sources: [SRC.oslerOntarioHiring],
    lastVerified: LAST_VERIFIED,
  },
];
