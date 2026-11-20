/**
 * Golden-case table (SPEC §10). One row per preset: expected vs actual tier and verdict, plus the
 * must / must-not / status checks. Exits non-zero on any mismatch.
 */
import { computeCase } from "../src/engine";
import { getPreset } from "../src/content/presets";
import { checkGolden } from "../tests/golden/check";
import { GOLDEN } from "../tests/golden/expectations";

type Row = {
  slug: string;
  expTier: string;
  tier: string;
  "pct (score/max)": string;
  expVerdict: string;
  verdict: string;
  checks: string;
  ok: string;
};

/** Fixed date so the table is reproducible (only the next review date depends on it). */
const TODAY = "2026-11-20";
const rows: Row[] = [];
const problems: string[] = [];

for (const exp of GOLDEN) {
  const preset = getPreset(exp.slug);
  if (!preset) {
    problems.push(`${exp.slug}: preset missing`);
    continue;
  }
  const r = computeCase(preset.intake, preset.decomposition, { today: TODAY });
  const p = checkGolden(r, exp);
  problems.push(...p.map((x) => `${exp.slug}: ${x}`));
  rows.push({
    slug: exp.slug,
    expTier: exp.tier,
    tier: r.tier.level,
    "pct (score/max)": `${r.tier.pct.toFixed(1)}% (${Math.round(r.tier.score * 100) / 100}/${r.tier.maxScore})`,
    expVerdict: exp.verdict,
    verdict: r.verdict.verdict,
    checks: `${exp.mustTrigger.length + exp.mustNotTrigger.length + exp.statuses.length} rule, ${Object.keys(exp.split).length} split, 1 drift`,
    ok: p.length === 0 ? "✓" : "✗",
  });
}

console.log("Splitline golden cases (SPEC §10)");
console.table(rows);
for (const p of problems) console.log(`  ✗ ${p}`);
const matching = rows.filter((r) => r.ok === "✓").length;
console.log(`${matching}/${GOLDEN.length} matching`);
process.exit(problems.length === 0 ? 0 : 1);
