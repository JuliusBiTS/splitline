/** Compares an engine result with a golden expectation. Shared by the golden tests and `pnpm eval:engine`. */
import type { EngineResult } from "@/engine";
import { severityRank } from "@/engine/rules";
import type { GoldenExpectation } from "./expectations";

export function checkGolden(result: EngineResult, exp: GoldenExpectation): string[] {
  const problems: string[] = [];
  const byId = new Map(result.triggeredRules.map((t) => [t.ruleId, t]));
  if (result.tier.level !== exp.tier) problems.push(`tier ${result.tier.level} ≠ ${exp.tier}`);
  if (result.verdict.verdict !== exp.verdict) problems.push(`verdict ${result.verdict.verdict} ≠ ${exp.verdict}`);
  for (const id of exp.mustTrigger) if (!byId.has(id)) problems.push(`missing ${id}`);
  for (const id of exp.mustNotTrigger) if (byId.has(id)) problems.push(`unexpected ${id}`);
  for (const s of exp.statuses) {
    const t = byId.get(s.ruleId);
    if (!t) {
      if (s.effectiveStatus || s.severity) problems.push(`missing ${s.ruleId} for status check`);
      continue;
    }
    if (s.effectiveStatus && t.effectiveStatus !== s.effectiveStatus)
      problems.push(`${s.ruleId} status ${t.effectiveStatus} ≠ ${s.effectiveStatus}`);
    if (s.notStatus && t.effectiveStatus === s.notStatus) problems.push(`${s.ruleId} must not be ${s.notStatus}`);
    if (s.severity && t.severity !== s.severity) problems.push(`${s.ruleId} severity ${t.severity} ≠ ${s.severity}`);
    if (s.maxSeverity && severityRank(t.severity) > severityRank(s.maxSeverity))
      problems.push(`${s.ruleId} severity ${t.severity} > ${s.maxSeverity}`);
  }
  return problems;
}
