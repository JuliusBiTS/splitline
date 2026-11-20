/**
 * Rule coverage (PLAN Phase 1): every rule triggers on at least one fixture and does not trigger
 * on at least one. Always-on rules can't have a non-triggering case; they must trigger on every fixture instead.
 */
import { describe, expect, it } from "vitest";
import { RULE_CATALOGUE } from "@/content/rules";
import { ALL_CASES, triggeredIds } from "../fixtures/cases";

const ALWAYS_ON = new Set(["REF-AIA-TIER", "ISO-42001"]);
const results = ALL_CASES.map((c) => ({ name: c.name, ids: new Set(triggeredIds(c)) }));

describe("rule coverage", () => {
  it.each(RULE_CATALOGUE.map((r) => [r.id] as const))("%s", (id) => {
    const hits = results.filter((r) => r.ids.has(id)).map((r) => r.name);
    const misses = results.filter((r) => !r.ids.has(id)).map((r) => r.name);
    if (ALWAYS_ON.has(id)) {
      expect(misses, `${id} is always-on`).toEqual([]);
    } else {
      expect(hits.length, `${id} never triggers`).toBeGreaterThan(0);
      expect(misses.length, `${id} always triggers`).toBeGreaterThan(0);
    }
  });

  it("every use-case pattern triggers at least one rule (ADR-0006)", () => {
    const patterns = [
      "hiring_selection",
      "performance_management",
      "clinical_triage",
      "ambient_scribe",
      "claims_eligibility",
      "administrative_decision",
      "customer_chatbot",
    ];
    for (const p of patterns) {
      const covered = RULE_CATALOGUE.some((r) => r.reads.includes("useCasePatterns") && ALL_CASES.some(
        (c) => (c.intake.useCasePatterns ?? []).includes(p as never) && triggeredIds(c).includes(r.id),
      ));
      expect(covered, p).toBe(true);
    }
  });
});
