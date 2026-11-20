/**
 * What-if (SPEC §7.6): apply toggles to the intake, recompute synchronously and diff the results.
 * The engine decides everything; the diff only compares two engine results.
 */
import { computeCase, type ComputeOptions, type EngineResult } from "./index";
import { VERDICT_LABELS } from "./verdict";
import {
  WhatIfTogglesSchema,
  type ConfirmedDecomposition,
  type IntakeInputRaw,
  type Jurisdiction,
  type WhatIfDiff,
  type WhatIfToggles,
} from "./types";

function setJurisdiction(list: readonly Jurisdiction[], j: Jurisdiction, on: boolean | undefined): Jurisdiction[] {
  if (on === undefined) return [...list];
  const without = list.filter((x) => x !== j);
  return on ? [...without, j] : without;
}

/** Returns a new intake with the toggles applied. Unset toggles leave the field as it is. */
export function applyWhatIf(intake: IntakeInputRaw, togglesInput: WhatIfToggles): IntakeInputRaw {
  const t = WhatIfTogglesSchema.parse(togglesInput);
  let jurisdictions = setJurisdiction(intake.jurisdictions, "quebec", t.quebecAffected);
  jurisdictions = setJurisdiction(jurisdictions, "ontario", t.ontarioAffected);
  // Turning off the only province leaves people elsewhere in Canada (the intake needs ≥ 1 jurisdiction).
  if (jurisdictions.length === 0) jurisdictions = ["other_provinces"];
  return {
    ...intake,
    jurisdictions,
    ...(t.hosting !== undefined && { hosting: t.hosting }),
    ...(t.aiDecisionRole !== undefined && { aiDecisionRole: t.aiDecisionRole }),
    ...(t.crisisContext !== undefined && { crisisContext: t.crisisContext }),
    ...(t.dynamism !== undefined && { dynamism: t.dynamism }),
    ...(t.customerFacingOutput !== undefined && { customerFacingOutput: t.customerFacingOutput }),
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function diffResults(before: EngineResult, after: EngineResult): WhatIfDiff {
  const beforeRules = new Map(before.triggeredRules.map((t) => [t.ruleId, t]));
  const afterRules = new Map(after.triggeredRules.map((t) => [t.ruleId, t]));
  const rulesAdded = after.triggeredRules.map((t) => t.ruleId).filter((id) => !beforeRules.has(id));
  const rulesRemoved = before.triggeredRules.map((t) => t.ruleId).filter((id) => !afterRules.has(id));
  const rulesChangedSeverity = before.triggeredRules.flatMap((b) => {
    const a = afterRules.get(b.ruleId);
    return a && a.severity !== b.severity ? [{ ruleId: b.ruleId, from: b.severity, to: a.severity }] : [];
  });
  const afterSplit = new Map(after.operatingModel.split.map((s) => [s.subtaskId, s.owner]));
  const splitChanges = before.operatingModel.split.flatMap((s) => {
    const to = afterSplit.get(s.subtaskId);
    return to && to !== s.owner ? [{ subtaskId: s.subtaskId, from: s.owner, to }] : [];
  });
  const tier = { from: before.tier.level, to: after.tier.level, changed: before.tier.level !== after.tier.level };
  const verdict = {
    from: before.verdict.verdict,
    to: after.verdict.verdict,
    changed: before.verdict.verdict !== after.verdict.verdict,
  };
  const cadence = {
    from: before.operatingModel.splitReviewCadence,
    to: after.operatingModel.splitReviewCadence,
    changed: before.operatingModel.splitReviewCadence !== after.operatingModel.splitReviewCadence,
  };

  const chips: string[] = [];
  chips.push(tier.changed ? `Tier ${tier.from} → ${tier.to}` : "Tier unchanged");
  chips.push(
    verdict.changed ? `Verdict: ${VERDICT_LABELS[verdict.from]} → ${VERDICT_LABELS[verdict.to]}` : "Verdict unchanged",
  );
  if (rulesAdded.length > 0) chips.push(`+${plural(rulesAdded.length, "rule")}`);
  if (rulesRemoved.length > 0) chips.push(`−${plural(rulesRemoved.length, "rule")}`);
  if (rulesChangedSeverity.length > 0) chips.push(`${plural(rulesChangedSeverity.length, "rule")} changed severity`);
  if (splitChanges.length > 0) chips.push(`${plural(splitChanges.length, "split owner")} changed`);
  if (cadence.changed) chips.push(`Split review: ${cadence.from} → ${cadence.to}`);

  return { tier, verdict, rulesAdded, rulesRemoved, rulesChangedSeverity, splitChanges, cadence, chips };
}

export interface WhatIfResult {
  result: EngineResult;
  diff: WhatIfDiff;
}

/** Recomputes the case with the toggles applied and diffs it against the base result. */
export function computeWhatIf(
  base: EngineResult,
  intake: IntakeInputRaw,
  decomposition: ConfirmedDecomposition,
  toggles: WhatIfToggles,
  options: ComputeOptions,
): WhatIfResult {
  const result = computeCase(applyWhatIf(intake, toggles), decomposition, options);
  return { result, diff: diffResults(base, result) };
}
