/**
 * IntakeInput + confirmed Decomposition → BaseFacts (SPEC §5–7, ADR-0004, ADR-0006).
 * Pure: reads only structured, user-set fields. `processDescription` is never read.
 */
import type {
  AiDecisionRole,
  AiType,
  BaseFacts,
  ConfirmedDecomposition,
  DataCategory,
  Dynamism,
  IntakeInput,
  OrgType,
  Reversibility,
  UseCasePattern,
} from "./types";

/** DADM anchors in order (research §2.5). Index = step. */
export const REVERSIBILITY_STEPS: readonly Reversibility[] = [
  "reversible_brief",
  "short_term",
  "hard_to_reverse",
  "irreversible",
];

/** Base reversibility step by decision role (ADR-0004 lookup). */
export const REVERSIBILITY_BASE: Record<AiDecisionRole, Reversibility> = {
  informs: "reversible_brief",
  recommends: "short_term",
  decides_with_review: "short_term",
  decides_alone: "hard_to_reverse",
};

/** Patterns that move reversibility one step up (decisions about people that are hard to undo). */
export const REVERSIBILITY_UP_PATTERNS: readonly UseCasePattern[] = [
  "hiring_selection",
  "clinical_triage",
  "claims_eligibility",
];

/** Data categories treated as likely sensitive (Splitline heuristic, ADR-0007 §4). */
export const SENSITIVE_CATEGORIES: readonly DataCategory[] = ["health", "biometric", "children", "financial"];

/** Default dynamism when the user leaves it unset (`02_*` §3.4: gen-AI high, stable classical ML low). */
export const DYNAMISM_DEFAULT: Record<AiType, Dynamism> = {
  generative_llm: "high",
  classical_ml: "low",
  rules: "low",
};

const PRIVATE_ORGS: readonly OrgType[] = ["bc_private", "other_canadian_private", "federally_regulated_fi"];
const BC_PUBLIC_BODIES: readonly OrgType[] = ["bc_public_body", "bc_crown_corp", "bc_health_authority"];

export function deriveReversibility(
  role: AiDecisionRole,
  patterns: readonly UseCasePattern[],
  hasAppealPath: boolean,
): Reversibility {
  let step = REVERSIBILITY_STEPS.indexOf(REVERSIBILITY_BASE[role]);
  if (patterns.some((p) => REVERSIBILITY_UP_PATTERNS.includes(p))) step += 1;
  if (hasAppealPath) step -= 1;
  const clamped = Math.min(REVERSIBILITY_STEPS.length - 1, Math.max(0, step));
  return REVERSIBILITY_STEPS[clamped] ?? "reversible_brief";
}

/**
 * ADR-0006 consequential floor: "Confirm split" is blocked when the AI does more than inform,
 * people other than businesses are affected, no subtask is consequential, and the user has not
 * explicitly confirmed that none is.
 */
export function consequentialFloorBlocks(
  intake: Pick<IntakeInput, "aiDecisionRole" | "affectedPeople">,
  decomposition: Pick<ConfirmedDecomposition, "subtasks" | "confirmedNoConsequential">,
): boolean {
  const affectsPeople = intake.affectedPeople.some((a) => a !== "businesses_only");
  const anyConsequential = decomposition.subtasks.some((s) => s.consequential);
  return (
    intake.aiDecisionRole !== "informs" &&
    affectsPeople &&
    !anyConsequential &&
    decomposition.confirmedNoConsequential !== true
  );
}

export function deriveFacts(intake: IntakeInput, decomposition: ConfirmedDecomposition): BaseFacts {
  const subtasks = decomposition.subtasks;
  const patterns = intake.useCasePatterns;
  const mitigations = intake.mitigations;
  const personalCategories = intake.dataCategories.filter((d) => d !== "no_personal");

  const reversibilityDerived = deriveReversibility(
    intake.aiDecisionRole,
    patterns,
    mitigations.includes("appeal_path"),
  );

  const highVolumeIndividuals = subtasks.some((s) => s.affectsIndividuals && s.volume === "high");
  const scale = Math.min(
    3,
    (intake.affectedPeople.includes("patients") || intake.dataCategories.includes("children") ? 1 : 0) +
      (intake.affectedPeople.includes("public_customers") || intake.affectedPeople.includes("patients") ? 1 : 0) +
      (highVolumeIndividuals ? 1 : 0),
  );

  const consequentialSubtasks = subtasks.filter((s) => s.consequential).map((s) => ({ id: s.id, name: s.name }));
  const bcConnected = intake.jurisdictions.includes("bc") || intake.orgType.startsWith("bc_");

  return {
    orgType: intake.orgType,
    sector: intake.sector,
    businessFunction: intake.businessFunction,
    aiDecisionRole: intake.aiDecisionRole,
    affectedPeople: [...intake.affectedPeople],
    dataCategories: [...intake.dataCategories],
    jurisdictions: [...intake.jurisdictions],
    hosting: intake.hosting,
    aiType: intake.aiType,
    dynamism: intake.dynamism ?? DYNAMISM_DEFAULT[intake.aiType],
    dynamismDerived: intake.dynamism === undefined,
    customerFacingOutput: intake.customerFacingOutput,
    monitorsEmployees: intake.monitorsEmployees,
    teamSetup: intake.teamSetup,
    readiness: intake.readiness,
    crisisContext: intake.crisisContext ?? false,
    proposedKpis: [...(intake.proposedKpis ?? [])],
    employerSize25Plus: intake.employerSize25Plus,
    useCasePatterns: [...patterns],
    mitigations: [...mitigations],
    genAiToolType: intake.genAiToolType,
    subtasks: subtasks.map((s) => ({ ...s })),

    personalData: personalCategories.length > 0,
    sensitiveCategories: intake.dataCategories.filter((d) => SENSITIVE_CATEGORIES.includes(d)),
    crossBorder: intake.hosting !== "in_canada",
    hostingUnknown: intake.hosting === "unsure",
    consequentialPresent: consequentialSubtasks.length > 0,
    consequentialSubtasks,
    confirmedNoConsequential: decomposition.confirmedNoConsequential === true,
    highVolumeIndividuals,
    privateSector: PRIVATE_ORGS.includes(intake.orgType),
    bcPublicBody: BC_PUBLIC_BODIES.includes(intake.orgType),
    federalInstitution: intake.orgType === "federal_institution",
    frfi: intake.orgType === "federally_regulated_fi",
    bcPipaOrg:
      intake.orgType === "bc_private" ||
      (intake.orgType === "other_canadian_private" && intake.jurisdictions.includes("bc")),
    bcConnected,
    reversibility: intake.reversibilityOverride ?? reversibilityDerived,
    reversibilityDerived,
    reversibilityOverridden: intake.reversibilityOverride !== undefined,
    scale,
    mitigationCount: new Set(mitigations).size,
  };
}
