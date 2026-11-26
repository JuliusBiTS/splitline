/**
 * Pure metric functions for `scripts/eval-llm.ts` (PLAN Phase 5). Tested in `eval-llm.lib.test.ts`.
 *
 * Definitions (also printed in the report):
 * - Schema-valid: the call ends with output that passes the local strict schema (and, for
 *   decompositions, grounding) within the one allowed retry. First-attempt validity is reported too.
 * - Completeness: every subtask has a non-empty name, description and rationale, and a grounded quote.
 * - Count stability: the subtask counts of an intake's runs differ by at most 1 (max − min ≤ 1).
 * - Attribute agreement: runs are compared pairwise; subtasks are matched greedily by name-word
 *   overlap (Jaccard ≥ 0.2); a matched pair scores the share of the 6 categorical attributes that
 *   agree; unmatched subtasks score 0; a pair's score is the sum divided by the longer list.
 * - Stability (per intake) = count stable AND mean attribute agreement ≥ 0.8; reported as the share
 *   of intakes that are stable, plus the mean agreement.
 */
import type { Subtask } from "../src/engine/types";

export const ATTRIBUTES = ["judgmentIntensity", "knowledgeType", "errorCost", "volume", "affectsIndividuals", "consequential"] as const;
export const MATCH_THRESHOLD = 0.2;
export const AGREEMENT_THRESHOLD = 0.8;

const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "for", "with", "in", "on", "by", "from"]);

export function words(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map((w) => w.replace(/(ing|es|s)$/, "")),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

export function countStable(counts: readonly number[]): boolean {
  return counts.length === 0 || Math.max(...counts) - Math.min(...counts) <= 1;
}

type Attr = Pick<Subtask, "name" | (typeof ATTRIBUTES)[number]>;

/** Pairwise attribute agreement between two decompositions (0–1). */
export function attributeAgreement(a: readonly Attr[], b: readonly Attr[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const pairs: Array<{ i: number; j: number; sim: number }> = [];
  a.forEach((x, i) => b.forEach((y, j) => pairs.push({ i, j, sim: jaccard(words(x.name), words(y.name)) })));
  pairs.sort((p, q) => q.sim - p.sim || p.i - q.i || p.j - q.j);
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  let score = 0;
  for (const { i, j, sim } of pairs) {
    if (sim < MATCH_THRESHOLD || usedA.has(i) || usedB.has(j)) continue;
    usedA.add(i);
    usedB.add(j);
    const x = a[i]!;
    const y = b[j]!;
    score += ATTRIBUTES.filter((k) => x[k] === y[k]).length / ATTRIBUTES.length;
  }
  return score / Math.max(a.length, b.length);
}

/** Mean pairwise agreement across all runs of one intake. */
export function meanAgreement(runs: ReadonlyArray<readonly Attr[]>): number {
  const scores: number[] = [];
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) scores.push(attributeAgreement(runs[i]!, runs[j]!));
  return scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 1;
}

export function isComplete(subtasks: readonly Pick<Subtask, "name" | "description" | "rationale">[], groundedCount: number): boolean {
  return subtasks.every((s) => s.name.trim() && s.description.trim() && s.rationale.trim()) && groundedCount === subtasks.length;
}

export const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(0)}%`);
