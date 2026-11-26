/**
 * The 6 sample intakes for `eval:llm` (PLAN Phase 5): the 4 presets plus 2 extra fictional cases
 * the prompts were not written against. Fictional organizations and roles only (ADR-0002).
 */
import { PRESETS } from "../src/content/presets";
import { IntakeInputSchema, type ConfirmedDecomposition, type IntakeInput } from "../src/engine/types";

export interface EvalIntake {
  id: string;
  intake: IntakeInput;
  /** The confirmed decomposition to narrate; undefined = narrate each run's own proposal. */
  confirmed?: ConfirmedDecomposition;
}

const EXTRA: Array<{ id: string; intake: IntakeInput }> = [
  {
    id: "extra-permit-inquiries",
    intake: IntakeInputSchema.parse({
      title: "Building permit inquiry assistant",
      processDescription:
        "Residents of a fictional BC municipality email and phone the permit office with questions about building permits: which permit they need, " +
        "what documents to submit and where their application stands. Clerks look up the bylaw and the application record, answer by email and " +
        "forward unusual cases to a plans examiner, who decides whether a permit is needed. We want a generative AI assistant on the website that " +
        "answers common questions from the published bylaw pages, looks up application status and drafts replies that a clerk sends, " +
        "while anything about whether a permit is required still goes to the plans examiner.",
      orgType: "bc_public_body",
      businessFunction: "customer_service",
      aiDecisionRole: "informs",
      affectedPeople: ["public_customers"],
      dataCategories: ["customer_pi"],
      jurisdictions: ["bc"],
      hosting: "us_or_global_api",
      aiType: "generative_llm",
      customerFacingOutput: true,
      monitorsEmployees: false,
      teamSetup: "vendor_run",
      readiness: "medium",
      sector: "other",
      useCasePatterns: [],
    }),
  },
  {
    id: "extra-loan-documents",
    intake: IntakeInputSchema.parse({
      title: "Small business loan document check",
      processDescription:
        "A fictional BC credit union receives small business loan applications with financial statements, tax notices and bank statements. " +
        "Loan officers check that every required document is present, key figures into the credit system, calculate debt service ratios and " +
        "write a credit memo with a recommendation; a credit committee approves or declines larger loans. We want a classical machine learning " +
        "model to flag missing or inconsistent documents, extract key figures and pre-fill the ratio calculations, so loan officers spend their " +
        "time on the credit memo and on conversations with the business owner.",
      orgType: "bc_private",
      businessFunction: "finance",
      aiDecisionRole: "recommends",
      affectedPeople: ["businesses_only", "public_customers"],
      dataCategories: ["financial", "customer_pi"],
      jurisdictions: ["bc"],
      hosting: "in_canada",
      aiType: "classical_ml",
      customerFacingOutput: false,
      monitorsEmployees: false,
      teamSetup: "separate_ai_team",
      readiness: "high",
      sector: "financial_services",
      useCasePatterns: [],
    }),
  },
];

export const EVAL_INTAKES: EvalIntake[] = [
  ...PRESETS.map((p) => ({ id: p.slug, intake: IntakeInputSchema.parse(p.intake), confirmed: p.decomposition })),
  ...EXTRA,
];
