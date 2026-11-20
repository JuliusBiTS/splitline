/** Plain-language labels for intake values, used in `matchedFacts` and the tier rationale. */
import type { CaseFacts, FactKey, Reversibility } from "./types";

export const VALUE_LABELS: Record<string, string> = {
  // org types
  bc_private: "BC private-sector organization",
  bc_public_body: "BC public body",
  bc_crown_corp: "BC Crown corporation",
  bc_health_authority: "BC health authority",
  federal_institution: "federal institution",
  federally_regulated_fi: "federally regulated financial institution",
  other_canadian_private: "other Canadian private-sector organization",
  // sectors
  insurance: "insurance",
  health_care: "health care",
  financial_services: "financial services",
  government_ministry: "government ministry",
  other: "other",
  // business functions
  operations: "operations",
  health_services: "health services",
  hr: "HR",
  legal_compliance: "legal and compliance",
  customer_service: "customer service",
  finance: "finance",
  // decision roles
  informs: "AI informs",
  recommends: "AI recommends",
  decides_with_review: "AI decides with human review",
  decides_alone: "AI decides alone",
  // affected people
  public_customers: "public or customers",
  employees_applicants: "employees or applicants",
  patients: "patients",
  businesses_only: "businesses only",
  // data
  no_personal: "no personal information",
  customer_pi: "customer personal information",
  employee_hr: "employee or HR information",
  health: "health information",
  biometric: "biometric information",
  children: "children's information",
  // jurisdictions
  bc: "British Columbia",
  ontario: "Ontario",
  quebec: "Quebec",
  other_provinces: "other provinces",
  // hosting
  in_canada: "in Canada",
  us_or_global_api: "US or global API",
  unsure: "unknown",
  // AI types
  generative_llm: "generative AI (LLM)",
  classical_ml: "classical machine learning",
  rules: "rules-based system",
  // team setup
  separate_ai_team: "separate AI team",
  embedded: "embedded in the team",
  vendor_run: "run by a vendor",
  // patterns
  hiring_selection: "hiring or selection",
  performance_management: "performance management",
  clinical_triage: "clinical triage or prioritization",
  ambient_scribe: "ambient recording or transcription",
  claims_eligibility: "claims, underwriting or eligibility",
  administrative_decision: "administrative decision about a client",
  customer_chatbot: "customer chatbot",
  // mitigations
  human_final_decision: "human makes the final decision",
  appeal_path: "appeal path",
  explanation_available: "explanation available",
  predeployment_testing: "pre-deployment testing",
  monitoring_plan: "monitoring plan",
  // gen-AI tool type
  public_tool: "public generative AI tool",
  approved_enterprise: "approved enterprise tool",
  direct_api: "direct API integration",
};

export const REVERSIBILITY_LABELS: Record<Reversibility, string> = {
  reversible_brief: "reversible and brief",
  short_term: "likely reversible and short-term",
  hard_to_reverse: "difficult to reverse",
  irreversible: "often irreversible",
};

export const FACT_LABELS: Record<FactKey, string> = {
  orgType: "Organization type",
  sector: "Sector",
  businessFunction: "Business function",
  aiDecisionRole: "AI decision role",
  affectedPeople: "Affected people",
  dataCategories: "Data categories",
  jurisdictions: "People affected in",
  hosting: "Processing and storage",
  aiType: "AI type",
  customerFacingOutput: "Customer-facing output",
  monitorsEmployees: "Monitors employees",
  teamSetup: "Team setup",
  employerSize25Plus: "25 or more employees",
  useCasePatterns: "Use-case patterns",
  mitigations: "Mitigations",
  genAiToolType: "Generative AI tool type",
  consequential: "Consequential step",
  indicativeTier: "AIA-inspired indicative tier",
};

export function valueLabel(v: string): string {
  return VALUE_LABELS[v] ?? v;
}

function listLabel(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.map(valueLabel).join(", ");
}

function yesNo(v: boolean | undefined, unset = "not set"): string {
  if (v === undefined) return unset;
  return v ? "yes" : "no";
}

/** Renders one fact as "Label: value". Hosting `unsure` gets the ADR-0007 wording. */
export function renderFact(key: FactKey, c: CaseFacts): string {
  switch (key) {
    case "hosting":
      return c.hostingUnknown
        ? "Hosting unknown; assumed outside Canada"
        : `${FACT_LABELS.hosting}: ${valueLabel(c.hosting)}`;
    case "affectedPeople":
    case "dataCategories":
    case "jurisdictions":
    case "useCasePatterns":
    case "mitigations":
      return `${FACT_LABELS[key]}: ${listLabel(c[key])}`;
    case "customerFacingOutput":
    case "monitorsEmployees":
      return `${FACT_LABELS[key]}: ${yesNo(c[key])}`;
    case "employerSize25Plus":
      return `${FACT_LABELS[key]}: ${yesNo(c.employerSize25Plus)}`;
    case "genAiToolType":
      return `${FACT_LABELS[key]}: ${c.genAiToolType ? valueLabel(c.genAiToolType) : "not set"}`;
    case "consequential":
      return c.consequentialSubtasks.length > 0
        ? `${FACT_LABELS[key]}: ${c.consequentialSubtasks.map((s) => s.name).join(", ")}`
        : `${FACT_LABELS[key]}: none`;
    case "indicativeTier":
      return `${FACT_LABELS[key]}: ${c.indicativeTier}`;
    default:
      return `${FACT_LABELS[key]}: ${valueLabel(c[key])}`;
  }
}
