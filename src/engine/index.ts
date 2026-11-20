/**
 * Engine entry point. Evaluation order (ADR-0007): facts → tier → rules → severity cap → verdict
 * → operating model → rollout. "Today" is injected (no clock reads in the engine; ADR-0016 §8).
 */
import { RULE_CATALOGUE, RULE_CATALOGUE_VERSION } from "@/content/rules";
import { deriveFacts } from "./facts";
import { computeOperatingModel } from "./operating-model";
import { computeRollout } from "./rollout";
import { evaluateRules } from "./rules";
import { computeTier } from "./tier";
import {
  ConfirmedDecompositionSchema,
  IntakeInputSchema,
  type CaseFacts,
  type ConfirmedDecomposition,
  type IntakeInputRaw,
  type OperatingModel,
  type RolloutPlan,
  type RuleDefinition,
  type TierResult,
  type TriggeredRule,
  type VerdictResult,
} from "./types";
import { computeVerdict } from "./verdict";
import { ENGINE_VERSION } from "./version";

export interface EngineResult {
  facts: CaseFacts;
  tier: TierResult;
  triggeredRules: TriggeredRule[];
  verdict: VerdictResult;
  operatingModel: OperatingModel;
  rollout: RolloutPlan;
  engineVersion: string;
  ruleCatalogueVersion: string;
}

export interface ComputeOptions {
  /** ISO date (YYYY-MM-DD) the next split review is counted from. */
  today: string;
  catalogue?: readonly RuleDefinition[];
}

export const DISCLAIMER_SHORT = "Indicative triage, not legal advice.";
export const DISCLAIMER_LONG =
  "Indicative triage only, not legal advice. Confirm with your privacy office or counsel.";

export function computeCase(
  intakeInput: IntakeInputRaw,
  decompositionInput: ConfirmedDecomposition,
  options: ComputeOptions,
): EngineResult {
  const catalogue = options.catalogue ?? RULE_CATALOGUE;
  const intake = IntakeInputSchema.parse(intakeInput);
  const decomposition = ConfirmedDecompositionSchema.parse(decompositionInput);
  const base = deriveFacts(intake, decomposition);
  const tier = computeTier(base);
  const facts: CaseFacts = { ...base, indicativeTier: tier.level };
  const triggeredRules = evaluateRules(catalogue, facts, tier.topFactors);
  const verdict = computeVerdict(triggeredRules, catalogue);
  const operatingModel = computeOperatingModel(facts, options.today);
  const rollout = computeRollout({ facts, triggeredRules, operatingModel, catalogue });
  return {
    facts,
    tier,
    triggeredRules,
    verdict,
    operatingModel,
    rollout,
    engineVersion: ENGINE_VERSION,
    ruleCatalogueVersion: RULE_CATALOGUE_VERSION,
  };
}
