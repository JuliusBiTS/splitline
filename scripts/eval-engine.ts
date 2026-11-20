/**
 * Golden-case table (SPEC §10). Prints one row per preset: expected vs actual tier and verdict.
 * Phase 0: no engine yet, so the table is empty. Phase 1 wires in computeCase() and the presets
 * and makes this exit non-zero on any mismatch.
 */
type Row = { slug: string; expectedTier: string; actualTier: string; expectedVerdict: string; actualVerdict: string; ok: boolean };

const rows: Row[] = [];

console.log("Splitline golden cases");
if (rows.length === 0) {
  console.log("(no golden cases wired yet: the engine lands in Phase 1)");
} else {
  console.table(rows);
}
const failed = rows.filter((r) => !r.ok).length;
console.log(`${rows.length - failed}/${rows.length} matching`);
process.exit(failed === 0 ? 0 : 1);
