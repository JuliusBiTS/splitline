/**
 * Case builders and named fixtures for engine tests (edge goldens, rule coverage).
 * All organizations are fictional; no real people.
 */
import { PRESETS } from "@/content/presets";
import { computeCase, type EngineResult } from "@/engine";
import type { ConfirmedDecomposition, IntakeInputRaw, Subtask } from "@/engine/types";

/** Fixed "today" for engine tests (the engine never reads the clock; ADR-0016 §8). */
export const TEST_TODAY = "2026-11-20";

export interface CaseInput {
  name: string;
  intake: IntakeInputRaw;
  decomposition: ConfirmedDecomposition;
}

const DESCRIPTION =
  "Fictional test case. Staff currently handle each item by hand, check it against written criteria and record the outcome in a case system. The proposed AI system would take over part of this work as described in the structured fields, with the team reviewing its output before anything is sent or recorded.";

export const BASE_INTAKE: IntakeInputRaw = {
  title: "Fictional test case",
  processDescription: DESCRIPTION,
  orgType: "bc_private",
  businessFunction: "operations",
  aiDecisionRole: "informs",
  affectedPeople: ["businesses_only"],
  dataCategories: ["no_personal"],
  jurisdictions: ["bc"],
  hosting: "in_canada",
  aiType: "rules",
  customerFacingOutput: false,
  monitorsEmployees: false,
  teamSetup: "embedded",
  readiness: "medium",
  sector: "other",
  useCasePatterns: [],
  mitigations: [],
};

export function subtask(id: string, over: Partial<Subtask> = {}): Subtask {
  return {
    id,
    name: `Step ${id}`,
    description: "A step of the fictional process.",
    judgmentIntensity: "low",
    knowledgeType: "codifiable",
    errorCost: "low",
    volume: "low",
    affectsIndividuals: false,
    consequential: false,
    rationale: "Test fixture.",
    ...over,
  };
}

export const PLAIN_DECOMPOSITION: ConfirmedDecomposition = {
  subtasks: [subtask("s1"), subtask("s2"), subtask("s3")],
  assumptions: [],
  clarifyingQuestions: [],
  suggestedUseCasePatterns: [],
};

/** Decomposition with one consequential, high-volume step that affects individuals. */
export const CONSEQUENTIAL_DECOMPOSITION: ConfirmedDecomposition = {
  ...PLAIN_DECOMPOSITION,
  subtasks: [
    subtask("s1", { affectsIndividuals: true, volume: "high" }),
    subtask("s2", { affectsIndividuals: true, consequential: true, judgmentIntensity: "high", errorCost: "high" }),
    subtask("s3"),
  ],
};

export function makeCase(
  name: string,
  over: Partial<IntakeInputRaw> = {},
  decomposition: ConfirmedDecomposition = PLAIN_DECOMPOSITION,
): CaseInput {
  return { name, intake: { ...BASE_INTAKE, ...over }, decomposition };
}

/** SPEC §10 edge goldens plus extra cases so every rule has a triggering and a non-triggering fixture. */
export const EDGE = {
  federalAdminDecision: makeCase(
    "federal institution, administrative decision",
    {
      orgType: "federal_institution",
      sector: "government_ministry",
      aiDecisionRole: "recommends",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      jurisdictions: ["other_provinces"],
      aiType: "classical_ml",
      useCasePatterns: ["administrative_decision"],
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  federalHighTier: makeCase(
    "federal institution, decides alone on health data",
    {
      orgType: "federal_institution",
      sector: "government_ministry",
      aiDecisionRole: "decides_alone",
      affectedPeople: ["patients"],
      dataCategories: ["health"],
      jurisdictions: ["other_provinces"],
      aiType: "classical_ml",
      useCasePatterns: ["administrative_decision"],
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  osfiBankGenerative: makeCase(
    "OSFI-regulated bank, generative",
    {
      orgType: "federally_regulated_fi",
      sector: "financial_services",
      businessFunction: "finance",
      aiDecisionRole: "recommends",
      affectedPeople: ["public_customers"],
      dataCategories: ["financial", "customer_pi"],
      jurisdictions: ["bc", "ontario"],
      aiType: "generative_llm",
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  osfiBankClassical: makeCase("OSFI-regulated bank, classical ML", {
    orgType: "federally_regulated_fi",
    sector: "financial_services",
    aiType: "classical_ml",
    jurisdictions: ["ontario"],
  }),
  quebecDecidesAlone: makeCase(
    "Quebec residents, exclusively automated decision",
    {
      orgType: "other_canadian_private",
      aiDecisionRole: "decides_alone",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      jurisdictions: ["quebec"],
      aiType: "classical_ml",
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  quebecWithReviewNoHfd: makeCase(
    "Quebec, decides with review, no human final decision",
    {
      orgType: "other_canadian_private",
      aiDecisionRole: "decides_with_review",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      jurisdictions: ["quebec"],
      aiType: "classical_ml",
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  quebecWithReviewHfd: makeCase(
    "Quebec, decides with review, human final decision",
    {
      orgType: "other_canadian_private",
      aiDecisionRole: "decides_with_review",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      jurisdictions: ["quebec"],
      aiType: "classical_ml",
      mitigations: ["human_final_decision"],
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  quebecInsurer: makeCase("Quebec private insurer", {
    orgType: "other_canadian_private",
    sector: "insurance",
    jurisdictions: ["quebec"],
  }),
  crisis: makeCase("crisis flag", { crisisContext: true }),
  lowReadiness: makeCase("low readiness", { readiness: "low" }),
  noPersonalData: makeCase("no personal data"),
  ontarioHiring25: makeCase(
    "Ontario hiring, 25 or more employees",
    {
      orgType: "other_canadian_private",
      businessFunction: "hr",
      aiDecisionRole: "recommends",
      affectedPeople: ["employees_applicants"],
      dataCategories: ["employee_hr"],
      jurisdictions: ["ontario"],
      aiType: "classical_ml",
      useCasePatterns: ["hiring_selection"],
      employerSize25Plus: true,
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  ontarioHiringUnset: makeCase(
    "Ontario hiring, headcount unset",
    {
      orgType: "other_canadian_private",
      businessFunction: "hr",
      aiDecisionRole: "recommends",
      affectedPeople: ["employees_applicants"],
      dataCategories: ["employee_hr"],
      jurisdictions: ["ontario"],
      aiType: "classical_ml",
      useCasePatterns: ["hiring_selection"],
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  ontarioHiringSmall: makeCase(
    "Ontario hiring, fewer than 25 employees",
    {
      orgType: "other_canadian_private",
      businessFunction: "hr",
      aiDecisionRole: "recommends",
      affectedPeople: ["employees_applicants"],
      dataCategories: ["employee_hr"],
      jurisdictions: ["ontario"],
      aiType: "classical_ml",
      useCasePatterns: ["hiring_selection"],
      employerSize25Plus: false,
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  ambientScribe: makeCase(
    "ambient scribe in a health authority",
    {
      orgType: "bc_health_authority",
      sector: "health_care",
      businessFunction: "health_services",
      aiDecisionRole: "informs",
      affectedPeople: ["patients"],
      dataCategories: ["health"],
      hosting: "in_canada",
      aiType: "generative_llm",
      useCasePatterns: ["ambient_scribe"],
    },
    PLAIN_DECOMPOSITION,
  ),
  ministryPublicTool: makeCase("BC ministry, public gen-AI tool", {
    orgType: "bc_public_body",
    sector: "government_ministry",
    aiType: "generative_llm",
    dataCategories: ["customer_pi"],
    affectedPeople: ["public_customers"],
    genAiToolType: "public_tool",
  }),
  ministryApprovedEnterprise: makeCase("BC ministry, approved enterprise tool", {
    orgType: "bc_public_body",
    sector: "government_ministry",
    aiType: "generative_llm",
    dataCategories: ["customer_pi"],
    affectedPeople: ["public_customers"],
    genAiToolType: "approved_enterprise",
  }),
  ministryToolUnset: makeCase("BC ministry, tool type unset", {
    orgType: "bc_public_body",
    sector: "government_ministry",
    aiType: "generative_llm",
    dataCategories: ["no_personal"],
  }),
  publicBodyEmployeeData: makeCase("BC public body, employee data outside Canada", {
    orgType: "bc_public_body",
    dataCategories: ["employee_hr"],
    affectedPeople: ["employees_applicants"],
    hosting: "us_or_global_api",
  }),
  customerChatbot: makeCase(
    "customer-facing generative chatbot",
    {
      businessFunction: "customer_service",
      aiDecisionRole: "informs",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      aiType: "generative_llm",
      customerFacingOutput: true,
      useCasePatterns: ["customer_chatbot"],
      hosting: "unsure",
    },
    PLAIN_DECOMPOSITION,
  ),
  privateInsurerClaims: makeCase(
    "BC private insurer, claims",
    {
      sector: "insurance",
      aiDecisionRole: "recommends",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      aiType: "classical_ml",
      useCasePatterns: ["claims_eligibility"],
    },
    CONSEQUENTIAL_DECOMPOSITION,
  ),
  employeeMonitoringOnly: makeCase("BC private, monitors employees outside HR", {
    monitorsEmployees: true,
    dataCategories: ["employee_hr"],
    affectedPeople: ["employees_applicants"],
  }),
} satisfies Record<string, CaseInput>;

export const PRESET_CASES: CaseInput[] = PRESETS.map((p) => ({
  name: p.slug,
  intake: p.intake,
  decomposition: p.decomposition,
}));

export const ALL_CASES: CaseInput[] = [...PRESET_CASES, ...Object.values(EDGE)];

export function run(c: CaseInput): EngineResult {
  return computeCase(c.intake, c.decomposition, { today: TEST_TODAY });
}

export function triggeredIds(c: CaseInput): string[] {
  return run(c).triggeredRules.map((t) => t.ruleId);
}
