/** Helper for per-rule tests: one case where the rule triggers (with optional status/severity) and one where it doesn't. */
import { expect, it } from "vitest";
import type { RuleStatus, Severity } from "@/engine/types";
import { run, type CaseInput } from "./cases";

export interface RuleCase {
  ruleId: string;
  triggers: CaseInput;
  status?: RuleStatus;
  severity?: Severity;
  doesNotTrigger: CaseInput;
}

export function ruleCases(cases: RuleCase[]): void {
  it.each(cases.map((c) => [c.ruleId, c] as const))("%s triggers and does not trigger as expected", (_id, c) => {
    const hit = run(c.triggers).triggeredRules.find((t) => t.ruleId === c.ruleId);
    expect(hit, `${c.ruleId} should trigger on "${c.triggers.name}"`).toBeDefined();
    if (c.status) expect(hit?.effectiveStatus).toBe(c.status);
    if (c.severity) expect(hit?.severity).toBe(c.severity);
    const miss = run(c.doesNotTrigger).triggeredRules.find((t) => t.ruleId === c.ruleId);
    expect(miss, `${c.ruleId} should not trigger on "${c.doesNotTrigger.name}"`).toBeUndefined();
  });
}
