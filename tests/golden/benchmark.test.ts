/**
 * PLAN Phase 2 acceptance / SPEC §7.6, §12: computeCase() + what-if diff < 100 ms on every preset.
 * Times one full recompute + diff per preset after a warm-up run (cold JIT is not what users feel
 * on a toggle). The worst of 5 runs must stay under the budget.
 */
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { PRESETS } from "@/content/presets";
import { computeCase } from "@/engine";
import { computeWhatIf } from "@/engine/whatif";
import { TEST_TODAY } from "../fixtures/cases";

const BUDGET_MS = 100;
const RUNS = 5;

describe("engine benchmark: computeCase + what-if diff < 100 ms", () => {
  // Warm-up across all presets.
  for (const p of PRESETS) {
    const base = computeCase(p.intake, p.decomposition, { today: TEST_TODAY });
    computeWhatIf(base, p.intake, p.decomposition, { hosting: "in_canada" }, { today: TEST_TODAY });
  }

  it.each(PRESETS.map((p) => [p.slug, p] as const))("%s", (slug, p) => {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const base = computeCase(p.intake, p.decomposition, { today: TEST_TODAY });
      const { diff } = computeWhatIf(
        base,
        p.intake,
        p.decomposition,
        { hosting: "in_canada", aiDecisionRole: "decides_alone", quebecAffected: true, crisisContext: true },
        { today: TEST_TODAY },
      );
      times.push(performance.now() - t0);
      expect(diff.chips.length).toBeGreaterThan(0);
    }
    const worst = Math.max(...times);
    console.log(`[benchmark] ${slug}: worst ${worst.toFixed(2)} ms, median ${[...times].sort((a, b) => a - b)[2]?.toFixed(2)} ms (computeCase + what-if)`);
    expect(worst).toBeLessThan(BUDGET_MS);
  });
});
