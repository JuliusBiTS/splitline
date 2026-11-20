/**
 * Verdict and top-3 conditions (SPEC §7.3, ADR-0007, ADR-0012). Uses effective severity only.
 */
import { severityRank } from "./rules";
import type { RuleDefinition, RuleStatus, TriggeredRule, Verdict, VerdictResult } from "./types";

export const VERDICT_LABELS: Record<Verdict, string> = {
  stop: "Stop",
  redesign: "Redesign",
  go_with_conditions: "Go with conditions",
  go: "Go",
};

/**
 * Bindingness for ranking (ADR-0012 §2): IN_FORCE > in-scope GOVERNMENT_POLICY > IN_FORCE_FUTURE
 * > REGULATOR_GUIDANCE > draft guidance > everything capped at info. Lower = more binding.
 */
export function bindingnessRank(t: Pick<TriggeredRule, "effectiveStatus" | "inScope">, isDraft: boolean): number {
  const s: RuleStatus = t.effectiveStatus;
  if (s === "IN_FORCE") return 0;
  if (s === "GOVERNMENT_POLICY" && t.inScope) return 1;
  if (s === "IN_FORCE_FUTURE") return 2;
  if (s === "REGULATOR_GUIDANCE" && !isDraft) return 3;
  if (s === "REGULATOR_GUIDANCE" && isDraft) return 4;
  return 5;
}

export function computeVerdict(
  triggered: readonly TriggeredRule[],
  catalogue: readonly RuleDefinition[],
): VerdictResult {
  const byId = new Map(catalogue.map((r, i) => [r.id, { rule: r, index: i }]));
  const blockers = triggered.filter((t) => t.severity === "blocker");
  const actions = triggered.filter((t) => t.severity === "action");

  let verdict: Verdict;
  if (blockers.some((t) => !byId.get(t.ruleId)?.rule.redesignPath)) verdict = "stop";
  else if (blockers.length > 0) verdict = "redesign";
  else if (actions.length > 0) verdict = "go_with_conditions";
  else verdict = "go";

  const topConditions = triggered
    .filter((t) => severityRank(t.severity) >= severityRank("action"))
    .map((t) => {
      const entry = byId.get(t.ruleId);
      const isDraft = t.effectiveStatus === "REGULATOR_GUIDANCE" && entry?.rule.draft !== undefined;
      return {
        id: t.ruleId,
        sev: severityRank(t.severity),
        bind: bindingnessRank(t, isDraft),
        factor: t.tierFactorMatch ? 0 : 1,
        order: entry?.index ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => b.sev - a.sev || a.bind - b.bind || a.factor - b.factor || a.order - b.order)
    .slice(0, 3)
    .map((x) => x.id);

  return { verdict, label: VERDICT_LABELS[verdict], topConditions };
}
