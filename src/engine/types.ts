/**
 * Domain types for the Splitline engine (SPEC §5–7). Zod is the single source of truth:
 * every exported type is inferred from a schema. The only exception is `RuleDefinition`,
 * whose predicates are functions; its serializable part (`RuleMetaSchema`) is validated by a test.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// §5 Intake
// ---------------------------------------------------------------------------

export const OrgTypeSchema = z.enum([
  "bc_private",
  "bc_public_body",
  "bc_crown_corp",
  "bc_health_authority",
  "federal_institution",
  "federally_regulated_fi",
  "other_canadian_private",
]);
export type OrgType = z.infer<typeof OrgTypeSchema>;

export const AiDecisionRoleSchema = z.enum(["informs", "recommends", "decides_with_review", "decides_alone"]);
export type AiDecisionRole = z.infer<typeof AiDecisionRoleSchema>;

export const DataCategorySchema = z.enum([
  "no_personal",
  "customer_pi",
  "employee_hr",
  "health",
  "financial",
  "biometric",
  "children",
]);
export type DataCategory = z.infer<typeof DataCategorySchema>;

export const HostingSchema = z.enum(["in_canada", "us_or_global_api", "unsure"]);
export type Hosting = z.infer<typeof HostingSchema>;

export const AiTypeSchema = z.enum(["generative_llm", "classical_ml", "rules"]);
export type AiType = z.infer<typeof AiTypeSchema>;

export const DynamismSchema = z.enum(["high", "medium", "low"]);
export type Dynamism = z.infer<typeof DynamismSchema>;

export const TeamSetupSchema = z.enum(["separate_ai_team", "embedded", "vendor_run"]);
export type TeamSetup = z.infer<typeof TeamSetupSchema>;

export const ReadinessSchema = z.enum(["low", "medium", "high"]);
export type Readiness = z.infer<typeof ReadinessSchema>;

export const SectorSchema = z.enum(["insurance", "health_care", "financial_services", "government_ministry", "other"]);
export type Sector = z.infer<typeof SectorSchema>;

export const UseCasePatternSchema = z.enum([
  "hiring_selection",
  "performance_management",
  "clinical_triage",
  "ambient_scribe",
  "claims_eligibility",
  "administrative_decision",
  "customer_chatbot",
]);
export type UseCasePattern = z.infer<typeof UseCasePatternSchema>;

export const MitigationSchema = z.enum([
  "human_final_decision",
  "appeal_path",
  "explanation_available",
  "predeployment_testing",
  "monitoring_plan",
]);
export type Mitigation = z.infer<typeof MitigationSchema>;

/** DADM reversibility anchors (research §2.5), ordered from least to most severe. */
export const ReversibilitySchema = z.enum(["reversible_brief", "short_term", "hard_to_reverse", "irreversible"]);
export type Reversibility = z.infer<typeof ReversibilitySchema>;

export const BusinessFunctionSchema = z.enum([
  "operations",
  "health_services",
  "hr",
  "legal_compliance",
  "customer_service",
  "finance",
  "other",
]);
export type BusinessFunction = z.infer<typeof BusinessFunctionSchema>;

export const AffectedPeopleSchema = z.enum(["public_customers", "employees_applicants", "patients", "businesses_only"]);
export type AffectedPeople = z.infer<typeof AffectedPeopleSchema>;

export const JurisdictionSchema = z.enum(["bc", "ontario", "quebec", "other_provinces"]);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

export const GenAiToolTypeSchema = z.enum(["public_tool", "approved_enterprise", "direct_api"]);
export type GenAiToolType = z.infer<typeof GenAiToolTypeSchema>;

export const IntakeInputSchema = z.object({
  title: z.string().min(1).max(80),
  processDescription: z.string().min(200).max(2000),
  orgType: OrgTypeSchema,
  businessFunction: BusinessFunctionSchema,
  aiDecisionRole: AiDecisionRoleSchema,
  affectedPeople: z.array(AffectedPeopleSchema).min(1),
  dataCategories: z.array(DataCategorySchema).min(1),
  jurisdictions: z.array(JurisdictionSchema).min(1),
  hosting: HostingSchema,
  aiType: AiTypeSchema,
  dynamism: DynamismSchema.optional(),
  customerFacingOutput: z.boolean(),
  monitorsEmployees: z.boolean(),
  teamSetup: TeamSetupSchema,
  readiness: ReadinessSchema,
  crisisContext: z.boolean().optional(),
  proposedKpis: z.array(z.string().max(120)).max(12).optional(),
  employerSize25Plus: z.boolean().optional(),
  sector: SectorSchema,
  useCasePatterns: z.array(UseCasePatternSchema).default([]),
  mitigations: z.array(MitigationSchema).default([]),
  reversibilityOverride: ReversibilitySchema.optional(),
  genAiToolType: GenAiToolTypeSchema.optional(),
});
export type IntakeInput = z.infer<typeof IntakeInputSchema>;
/** Input shape before Zod defaults are applied (e.g. a share link or a preset file). */
export type IntakeInputRaw = z.input<typeof IntakeInputSchema>;

// ---------------------------------------------------------------------------
// §6 Decomposition
// ---------------------------------------------------------------------------

export const SubtaskSchema = z.object({
  id: z.string().regex(/^s[1-8]$/),
  name: z.string().min(1).max(60),
  description: z.string().max(240),
  judgmentIntensity: z.enum(["low", "medium", "high"]),
  knowledgeType: z.enum(["codifiable", "tacit"]),
  errorCost: z.enum(["low", "medium", "high", "critical"]),
  volume: z.enum(["low", "medium", "high"]),
  affectsIndividuals: z.boolean(),
  consequential: z.boolean(),
  rationale: z.string().max(200),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const DecompositionSchema = z.object({
  subtasks: z.array(SubtaskSchema).min(3).max(8),
  assumptions: z.array(z.string()).max(5),
  clarifyingQuestions: z.array(z.string()).max(3),
  suggestedUseCasePatterns: z.array(UseCasePatternSchema),
});
export type Decomposition = z.infer<typeof DecompositionSchema>;

/**
 * The decomposition after the user pressed "Confirm split" (ADR-0006, ADR-0014).
 * `confirmedNoConsequential` records the explicit "no step bears on a decision about a person"
 * confirmation that unblocks the consequential floor; it is shown in the tier rationale.
 */
export const ConfirmedDecompositionSchema = DecompositionSchema.extend({
  confirmedNoConsequential: z.boolean().optional(),
});
export type ConfirmedDecomposition = z.infer<typeof ConfirmedDecompositionSchema>;

// ---------------------------------------------------------------------------
// Case facts (derived from intake + confirmed decomposition; never from free text)
// ---------------------------------------------------------------------------

export const TierLevelSchema = z.enum(["I", "II", "III", "IV"]);
export type TierLevel = z.infer<typeof TierLevelSchema>;

export const BaseFactsSchema = z.object({
  // User-set fields (copied, with defaults resolved). `title` and `processDescription` are left out on purpose.
  orgType: OrgTypeSchema,
  sector: SectorSchema,
  businessFunction: BusinessFunctionSchema,
  aiDecisionRole: AiDecisionRoleSchema,
  affectedPeople: z.array(AffectedPeopleSchema),
  dataCategories: z.array(DataCategorySchema),
  jurisdictions: z.array(JurisdictionSchema),
  hosting: HostingSchema,
  aiType: AiTypeSchema,
  dynamism: DynamismSchema,
  dynamismDerived: z.boolean(),
  customerFacingOutput: z.boolean(),
  monitorsEmployees: z.boolean(),
  teamSetup: TeamSetupSchema,
  readiness: ReadinessSchema,
  crisisContext: z.boolean(),
  proposedKpis: z.array(z.string()),
  employerSize25Plus: z.boolean().optional(),
  useCasePatterns: z.array(UseCasePatternSchema),
  mitigations: z.array(MitigationSchema),
  genAiToolType: GenAiToolTypeSchema.optional(),
  subtasks: z.array(SubtaskSchema),
  // Derived flags
  personalData: z.boolean(),
  sensitiveCategories: z.array(DataCategorySchema),
  crossBorder: z.boolean(),
  hostingUnknown: z.boolean(),
  consequentialPresent: z.boolean(),
  consequentialSubtasks: z.array(z.object({ id: z.string(), name: z.string() })),
  confirmedNoConsequential: z.boolean(),
  highVolumeIndividuals: z.boolean(),
  privateSector: z.boolean(),
  bcPublicBody: z.boolean(),
  federalInstitution: z.boolean(),
  frfi: z.boolean(),
  bcPipaOrg: z.boolean(),
  bcConnected: z.boolean(),
  reversibility: ReversibilitySchema,
  reversibilityDerived: ReversibilitySchema,
  reversibilityOverridden: z.boolean(),
  scale: z.number().int().min(0).max(3),
  mitigationCount: z.number().int().min(0).max(5),
});
/** Facts the tier may read. The tier never sees rule results (ADR-0007). */
export type BaseFacts = z.infer<typeof BaseFactsSchema>;

export const CaseFactsSchema = BaseFactsSchema.extend({ indicativeTier: TierLevelSchema });
/** Facts the rules read: base facts plus the indicative tier (e.g. FED-DADM-HITL). */
export type CaseFacts = z.infer<typeof CaseFactsSchema>;

// ---------------------------------------------------------------------------
// §7.2 Tier
// ---------------------------------------------------------------------------

export const TierFactorKeySchema = z.enum([
  "aiDecisionRole",
  "consequential",
  "dataSensitivity",
  "affectedPeople",
  "reversibility",
  "scale",
  "customerFacingGenerative",
]);
export type TierFactorKey = z.infer<typeof TierFactorKeySchema>;

export const TierFactorSchema = z.object({
  key: TierFactorKeySchema,
  label: z.string(),
  valueLabel: z.string(),
  points: z.number(),
  maxPoints: z.number(),
});
export type TierFactor = z.infer<typeof TierFactorSchema>;

export const TierResultSchema = z.object({
  label: z.literal("AIA-inspired indicative tier"),
  level: TierLevelSchema,
  rawScore: z.number(),
  score: z.number(),
  maxScore: z.number(),
  pct: z.number(),
  mitigationDeductionApplied: z.boolean(),
  factors: z.array(TierFactorSchema),
  topFactors: z.array(TierFactorKeySchema).max(3),
  rationale: z.array(z.string()),
});
export type TierResult = z.infer<typeof TierResultSchema>;

// ---------------------------------------------------------------------------
// §7.1 Rules
// ---------------------------------------------------------------------------

export const RuleStatusSchema = z.enum([
  "IN_FORCE",
  "IN_FORCE_FUTURE",
  "PROPOSED",
  "REGULATOR_GUIDANCE",
  "GOVERNMENT_POLICY",
  "VOLUNTARY",
  "REFERENCE",
]);
export type RuleStatus = z.infer<typeof RuleStatusSchema>;

export const SeveritySchema = z.enum(["info", "action", "blocker"]);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Case facts a rule can name in "Why this applies" (ADR-0014). A rule declares the keys it reads;
 * `matchedFacts` renders them with the case's values.
 */
export const FactKeySchema = z.enum([
  "orgType",
  "sector",
  "businessFunction",
  "aiDecisionRole",
  "affectedPeople",
  "dataCategories",
  "jurisdictions",
  "hosting",
  "aiType",
  "customerFacingOutput",
  "monitorsEmployees",
  "teamSetup",
  "employerSize25Plus",
  "useCasePatterns",
  "mitigations",
  "genAiToolType",
  "consequential",
  "indicativeTier",
]);
export type FactKey = z.infer<typeof FactKeySchema>;

const IsoDate = z.iso.date();

export const RuleSourceSchema = z.object({ label: z.string().min(1), url: z.url() });

/** Serializable part of a rule definition. Validated for every catalogue entry by a test. */
export const RuleMetaSchema = z
  .object({
    id: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)+$/),
    title: z.string().min(1),
    jurisdiction: z.enum(["federal", "bc", "on", "qc", "intl"]),
    instrument: z.string().min(1),
    status: RuleStatusSchema,
    effectiveDate: IsoDate.optional(),
    draft: z.object({ consultationEnds: IsoDate.optional() }).optional(),
    statusWhenOutOfScope: RuleStatusSchema.optional(),
    scopeLabel: z.string().optional(),
    reads: z.array(FactKeySchema).min(1),
    consideration: z.string().min(1),
    actionsToConsider: z.array(z.string().min(1)).min(1),
    /** How the use case can be redesigned to clear a blocker. Required for any rule that can block. */
    redesignPath: z.string().optional(),
    /** Likely owner role for planning (ADR-0018). Required for rules that can reach action or blocker (catalogue test). */
    ownerRole: z.string().min(1).optional(),
    /** Rough effort band for planning (ADR-0018). */
    effort: z.enum(["small", "medium", "large"]).optional(),
    sources: z.array(RuleSourceSchema).min(1),
    lastVerified: IsoDate,
  })
  .refine((r) => r.status !== "IN_FORCE_FUTURE" || r.effectiveDate !== undefined, {
    message: "effectiveDate is required when status is IN_FORCE_FUTURE",
    path: ["effectiveDate"],
  });
export type RuleMeta = z.infer<typeof RuleMetaSchema>;

/**
 * A catalogue rule (SPEC §7.1, ADR-0012, ADR-0014). Predicates read only `CaseFacts`
 * (user-set fields and values derived from them), never free text.
 */
export type RuleDefinition = RuleMeta & {
  /** Who the instrument binds or addresses; default: always in scope. */
  inScope?: (c: CaseFacts) => boolean;
  appliesWhen: (c: CaseFacts) => boolean;
  /** Requested severity before the status cap. */
  severity: (c: CaseFacts) => Severity;
  /** Case-dependent wording shown with the rule. */
  notes?: (c: CaseFacts) => string[];
  /** Case-dependent actions appended to `actionsToConsider`. */
  extraActions?: (c: CaseFacts) => string[];
};

export const TriggeredRuleSchema = z.object({
  ruleId: z.string(),
  effectiveStatus: RuleStatusSchema,
  /** True when the rule's `inScope` holds (or it has none). */
  inScope: z.boolean(),
  /** Effective severity after the status cap. */
  severity: SeveritySchema,
  /** Severity the rule asked for before the cap (for transparency and tests). */
  requestedSeverity: SeveritySchema,
  matchedFacts: z.array(z.string()),
  /** Case-dependent wording (ADR-0014), e.g. the FIPPA-XB "assess whether sensitive" variant. */
  notes: z.array(z.string()),
  /** `actionsToConsider` plus case-dependent actions. */
  actions: z.array(z.string()),
  /** Tier factors this rule's facts overlap with (used by the top-3 ranking). */
  tierFactorMatch: z.boolean(),
});
export type TriggeredRule = z.infer<typeof TriggeredRuleSchema>;

// ---------------------------------------------------------------------------
// §7.3 Verdict
// ---------------------------------------------------------------------------

export const VerdictSchema = z.enum(["stop", "redesign", "go_with_conditions", "go"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const VerdictResultSchema = z.object({
  verdict: VerdictSchema,
  label: z.string(),
  /** Rule IDs of the top 3 conditions (effective severity ≥ action), ranked per ADR-0007/0012. */
  topConditions: z.array(z.string()).max(3),
});
export type VerdictResult = z.infer<typeof VerdictResultSchema>;

// ---------------------------------------------------------------------------
// §7.4 Operating model (types only; logic lands in Phase 2)
// ---------------------------------------------------------------------------

export const SplitOwnerSchema = z.enum(["machine", "machine_review", "human"]);
export type SplitOwner = z.infer<typeof SplitOwnerSchema>;

export const SplitItemSchema = z.object({ subtaskId: z.string(), owner: SplitOwnerSchema, reason: z.string() });
export type SplitItem = z.infer<typeof SplitItemSchema>;

export const LeverCardSchema = z.object({
  lever: z.enum(["decision_rights", "coordination", "exchange"]),
  setting: z.string(),
  guardrail: z.string(),
  directCost: z.string(),
  monitoringIndicator: z.string(),
  warningIndicator: z.string(),
  details: z.array(z.string()),
});
export type LeverCard = z.infer<typeof LeverCardSchema>;

/** ADR-0018: rough, case-specific cost lines; the thesis direct cost stays on each LeverCard. */
export const CostEstimateSchema = z.object({
  topic: z.enum(["decision_rights", "coordination", "exchange", "review"]),
  lines: z.array(z.string().min(1)).min(1),
});
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

export const OperatingModelSchema = z.object({
  split: z.array(SplitItemSchema),
  isStartingSplit: z.literal(true),
  nextReviewDate: IsoDate,
  splitReviewCadence: z.enum(["monthly", "bimonthly", "quarterly"]),
  levers: z.tuple([LeverCardSchema, LeverCardSchema, LeverCardSchema]),
  driftCheck: z.object({
    ok: z.boolean(),
    missing: z.array(z.enum(["augmentation_value", "learning_loop"])),
    suggestedKpis: z.array(z.string()),
  }),
  scopeNotes: z.array(z.string()),
  /** Case-specific operational cost estimates (ADR-0018): one per lever, plus "review" when people check AI output. */
  costEstimates: z.array(CostEstimateSchema).min(3),
});
export type OperatingModel = z.infer<typeof OperatingModelSchema>;

export const LeverKeySchema = z.enum(["decision_rights", "coordination", "exchange"]);
export type LeverKey = z.infer<typeof LeverKeySchema>;

export const SplitReviewCadenceSchema = z.enum(["monthly", "bimonthly", "quarterly"]);
export type SplitReviewCadence = z.infer<typeof SplitReviewCadenceSchema>;

export const KpiKindSchema = z.enum(["efficiency", "augmentation_value", "learning_loop"]);
export type KpiKind = z.infer<typeof KpiKindSchema>;

// ---------------------------------------------------------------------------
// §7.5 Rollout (ADR-0016)
// ---------------------------------------------------------------------------

export const DeliverableSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rule"), ruleId: z.string() }),
  z.object({ kind: z.literal("lever"), lever: LeverKeySchema }),
  z.object({ kind: z.literal("model") }),
]);
export type DeliverableSource = z.infer<typeof DeliverableSourceSchema>;

export const DeliverableSchema = z.object({
  text: z.string(),
  source: DeliverableSourceSchema,
  /** Likely owner role for planning (ADR-0018), e.g. "Privacy office". Never a legal duty. */
  ownerRole: z.string().min(1),
});
export type Deliverable = z.infer<typeof DeliverableSchema>;

export const RolloutKpiSchema = z.object({
  kind: KpiKindSchema,
  name: z.string(),
  /** True when the KPI comes from the user's proposed KPIs; false when Splitline suggests it. */
  fromUser: z.boolean(),
});
export type RolloutKpi = z.infer<typeof RolloutKpiSchema>;

export const RolloutPhaseSchema = z.object({
  id: z.enum(["foundation", "shadow_pilot", "controlled_scale"]),
  days: z.string(),
  title: z.string(),
  deliverables: z.array(DeliverableSchema),
  kpis: z.array(z.string()),
  gateCriteria: z.array(z.string()),
});
export type RolloutPhase = z.infer<typeof RolloutPhaseSchema>;

export const MonitoringPlanItemSchema = z.object({
  lever: LeverKeySchema,
  monitoringIndicator: z.string(),
  warningIndicator: z.string(),
});
export type MonitoringPlanItem = z.infer<typeof MonitoringPlanItemSchema>;

export const RolloutPlanSchema = z.object({
  phases: z.tuple([RolloutPhaseSchema, RolloutPhaseSchema, RolloutPhaseSchema]),
  /** Always exactly one efficiency, one augmentation-value and one learning-loop KPI (SPEC §7.5). */
  kpis: z.tuple([RolloutKpiSchema, RolloutKpiSchema, RolloutKpiSchema]),
  monitoringPlan: z.tuple([MonitoringPlanItemSchema, MonitoringPlanItemSchema, MonitoringPlanItemSchema]),
});
export type RolloutPlan = z.infer<typeof RolloutPlanSchema>;

// ---------------------------------------------------------------------------
// §7.6 What-if (ADR-0016)
// ---------------------------------------------------------------------------

export const WhatIfTogglesSchema = z
  .object({
    hosting: HostingSchema,
    aiDecisionRole: AiDecisionRoleSchema,
    quebecAffected: z.boolean(),
    ontarioAffected: z.boolean(),
    crisisContext: z.boolean(),
    dynamism: DynamismSchema,
    customerFacingOutput: z.boolean(),
  })
  .partial();
export type WhatIfToggles = z.infer<typeof WhatIfTogglesSchema>;

export const WhatIfDiffSchema = z.object({
  tier: z.object({ from: TierLevelSchema, to: TierLevelSchema, changed: z.boolean() }),
  verdict: z.object({ from: VerdictSchema, to: VerdictSchema, changed: z.boolean() }),
  rulesAdded: z.array(z.string()),
  rulesRemoved: z.array(z.string()),
  /** Rules present in both results whose effective severity changed. */
  rulesChangedSeverity: z.array(z.object({ ruleId: z.string(), from: SeveritySchema, to: SeveritySchema })),
  splitChanges: z.array(z.object({ subtaskId: z.string(), from: SplitOwnerSchema, to: SplitOwnerSchema })),
  cadence: z.object({ from: SplitReviewCadenceSchema, to: SplitReviewCadenceSchema, changed: z.boolean() }),
  /** Decision-rights setting (e.g. crisis → temporary centralization, which reverses P1). */
  decisionRights: z.object({ from: z.string(), to: z.string(), changed: z.boolean() }),
  scopeNotesAdded: z.array(z.string()),
  scopeNotesRemoved: z.array(z.string()),
  chips: z.array(z.string()),
});
export type WhatIfDiff = z.infer<typeof WhatIfDiffSchema>;

// ---------------------------------------------------------------------------
// §7.7 Reinforcement Pulse (ADR-0009, ADR-0016)
// ---------------------------------------------------------------------------

const PulseItem = z.number().int().min(1).max(7);

export const PulseRoleSchema = z.enum(["augmentation_work", "ai_team", "lead"]);
export type PulseRole = z.infer<typeof PulseRoleSchema>;

export const PulseInputSchema = z.object({
  /** Context only (ADR-0009): one respondent answers all nine items. */
  role: PulseRoleSchema,
  A1: PulseItem,
  A2: PulseItem,
  A3: PulseItem,
  B1: PulseItem,
  B2: PulseItem,
  B3: PulseItem,
  D1: PulseItem,
  D2: PulseItem,
  D3: PulseItem,
});
export type PulseInput = z.infer<typeof PulseInputSchema>;

export const PulseQuadrantSchema = z.enum(["virtuous", "one_sided", "one_way_limit", "vicious"]);
export type PulseQuadrant = z.infer<typeof PulseQuadrantSchema>;

export const PulseDriverSchema = z.enum(["D1", "D2", "D3"]);
export type PulseDriver = z.infer<typeof PulseDriverSchema>;

export const PulseResultSchema = z.object({
  /** A→B (automation → augmentation), −1 to +1. */
  a: z.number().min(-1).max(1),
  /** B→A (augmentation → automation), −1 to +1. */
  b: z.number().min(-1).max(1),
  /** min(A→B, B→A). Non-compensatory. */
  reinforcement: z.number().min(-1).max(1),
  /** Which direction sets the minimum ("both" when equal). */
  weakerDirection: z.enum(["a_to_b", "b_to_a", "both"]),
  quadrant: PulseQuadrantSchema,
  laggingDrivers: z.array(
    z.object({
      item: PulseDriverSchema,
      score: z.number(),
      lever: LeverKeySchema,
      leverName: z.string(),
      guardrail: z.string().min(1),
      directCost: z.string().min(1),
    }),
  ),
  /** True when the scores show a problem (reinforcement ≤ 0), so the driver check is the next step. */
  driverCheckRelevant: z.boolean(),
  role: PulseRoleSchema,
  labels: z.object({
    short: z.literal("illustrative, not validated"),
    footnote: z.literal("Illustrative instrument from a conceptual thesis; not psychometrically validated."),
    perspective: z.literal("single-perspective estimate"),
    roleNote: z.string(),
    scopeDisclosure: z.string(),
  }),
});
export type PulseResult = z.infer<typeof PulseResultSchema>;

// ---------------------------------------------------------------------------
// §10 Presets
// ---------------------------------------------------------------------------

export const PresetSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  organization: z.string().min(1),
  /** Why the verdict is what it is, in at most 3 sentences (SPEC §10). */
  verdictExplanation: z.string().min(1),
  intake: IntakeInputSchema,
  decomposition: ConfirmedDecompositionSchema,
});
export type Preset = z.infer<typeof PresetSchema>;
