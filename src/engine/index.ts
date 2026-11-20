/**
 * Engine entry point. Evaluation order (ADR-0007): facts → tier → rules → severity cap → verdict.
 * Operating model and rollout are added in Phase 2.
 */
import { RULE_CATALOGUE, RULE_CATALOGUE_VERSION } from "@/content/rules";
import { deriveFacts } from "./facts";
import { evaluateRules } from "./rules";
import { computeTier } from "./tier";
import {
  ConfirmedDecompositionSchema,
  IntakeInputSchema,
  type CaseFacts,
  type ConfirmedDecomposition,
  type IntakeInputRaw,
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
  engineVersion: string;
  ruleCatalogueVersion: string;
}

export const DISCLAIMER_SHORT = "Indicative triage, not legal advice.";
export const DISCLAIMER_LONG =
  "Indicative triage only, not legal advice. Confirm with your privacy office or counsel.";

export function computeCase(
  intakeInput: IntakeInputRaw,
  decompositionInput: ConfirmedDecomposition,
  catalogue: readonly RuleDefinition[] = RULE_CATALOGUE,
): EngineResult {
  const intake = IntakeInputSchema.parse(intakeInput);
  const decomposition = ConfirmedDecompositionSchema.parse(decompositionInput);
  const base = deriveFacts(intake, decomposition);
  const tier = computeTier(base);
  const facts: CaseFacts = { ...base, indicativeTier: tier.level };
  const triggeredRules = evaluateRules(catalogue, facts, tier.topFactors);
  const verdict = computeVerdict(triggeredRules, catalogue);
  return {
    facts,
    tier,
    triggeredRules,
    verdict,
    engineVersion: ENGINE_VERSION,
    ruleCatalogueVersion: RULE_CATALOGUE_VERSION,
  };
}
