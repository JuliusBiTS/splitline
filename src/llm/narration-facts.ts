/**
 * The engine facts a narrative may use (SPEC §8). Built only from `EngineResult` and the confirmed
 * decomposition: never from the free-text description. Manager language (ADR-0018): plain owner
 * and lever labels, rule sources by short name, no internal IDs.
 */
import { OWNER_LABELS } from "@/components/splitline/split-map.logic";
import { getRule } from "@/content/rules";
import { CADENCE_LABELS } from "@/engine/cadence";
import type { EngineResult } from "@/engine/index";
import { DIRECT_COST_PLAIN, LEVER_PLAIN_NAMES } from "@/engine/levers";
import { statusLabel } from "@/engine/rules";
import type { ConfirmedDecomposition, Severity, TriggeredRule } from "@/engine/types";
import { displayNameFor } from "./statute-lexicon";

export interface NarrationRuleFact {
  source: string;
  title: string;
  status: string;
  severity: Severity;
  likelyOwner?: string;
}

export interface NarrationFacts {
  caseTitle: string;
  tier: { label: "AIA-inspired indicative tier"; level: string };
  verdict: string;
  /** Top conditions to clear before a pilot (effective severity ≥ action), ranked by the engine. */
  conditions: NarrationRuleFact[];
  otherRules: NarrationRuleFact[];
  split: Array<{ step: string; owner: string; reason: string }>;
  splitReview: { cadence: string; nextReviewDate: string; note: string };
  levers: Array<{ name: string; setting: string; guardrail: string; directCost: string }>;
  rollout: Array<{ days: string; title: string; deliverables: string[]; gateCriteria: string[] }>;
  kpis: string[];
  scopeNotes: string[];
}

/**
 * Status wording that differs from the generic label. HC-SAMD-01 is a check against the exclusion
 * criteria, not a finding that the device rules apply (research §2.9).
 */
export const STATUS_WORDING_OVERRIDES: Readonly<Record<string, string>> = {
  "HC-SAMD-01": "likely triggers a classification check",
};

function ruleFact(t: TriggeredRule): NarrationRuleFact {
  const rule = getRule(t.ruleId);
  const fact: NarrationRuleFact = {
    source: displayNameFor(t.ruleId),
    title: rule?.title ?? t.ruleId,
    status: STATUS_WORDING_OVERRIDES[t.ruleId] ?? (rule ? statusLabel(rule, t) : t.effectiveStatus),
    severity: t.severity,
  };
  if (rule?.ownerRole && t.severity !== "info") fact.likelyOwner = rule.ownerRole;
  return fact;
}

export function buildNarrationFacts(
  result: EngineResult,
  decomposition: ConfirmedDecomposition,
  caseTitle: string,
): NarrationFacts {
  const names = new Map(decomposition.subtasks.map((s) => [s.id, s.name]));
  const top = new Set(result.verdict.topConditions);
  const byId = new Map(result.triggeredRules.map((t) => [t.ruleId, t]));
  const conditions = result.verdict.topConditions
    .map((id) => byId.get(id))
    .filter((t): t is TriggeredRule => t !== undefined)
    .map(ruleFact);
  const om = result.operatingModel;
  return {
    caseTitle,
    tier: { label: result.tier.label, level: result.tier.level },
    verdict: result.verdict.label,
    conditions,
    otherRules: result.triggeredRules.filter((t) => !top.has(t.ruleId)).map(ruleFact),
    split: om.split.map((s) => ({ step: names.get(s.subtaskId) ?? "Unnamed step", owner: OWNER_LABELS[s.owner], reason: s.reason })),
    splitReview: {
      cadence: CADENCE_LABELS[om.splitReviewCadence],
      nextReviewDate: om.nextReviewDate,
      note: "This is a starting split: the team reviews it and moves steps as evidence comes in.",
    },
    levers: om.levers.map((l) => ({
      name: LEVER_PLAIN_NAMES[l.lever],
      setting: l.setting,
      guardrail: l.guardrail,
      directCost: DIRECT_COST_PLAIN[l.lever],
    })),
    rollout: result.rollout.phases.map((p) => ({
      days: p.days,
      title: p.title,
      deliverables: p.deliverables.map((d) => d.text),
      gateCriteria: p.gateCriteria,
    })),
    kpis: result.rollout.kpis.map((k) => k.name),
    scopeNotes: om.scopeNotes,
  };
}

/** The user-typed names in the facts; the guard masks them (a step called "s1" is not an ID). */
export function userNamesOf(facts: NarrationFacts): string[] {
  return [facts.caseTitle, ...facts.split.map((s) => s.step)];
}
