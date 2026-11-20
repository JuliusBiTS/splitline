/**
 * Logic for the hand-built score charts: DivergingScoreBar and QuadrantChart.
 * Thesis rules (02_* §1, §3.7): reinforcement = min(A→B, B→A), non-compensatory; quadrants via the
 * engine's `quadrantOf`; only the virtuous (top-right) quadrant is shaded positive.
 */
import { QUADRANT_LABELS, quadrantOf } from "@/engine/pulse";
import type { PulseResult } from "@/engine/types";
import { formatSigned } from "./format";

export const clampScore = (v: number): number => Math.max(-1, Math.min(1, v));

export interface BarGeometry {
  side: "pos" | "neg" | "zero";
  /** Percent of the full track width (the half-track is 50 %). */
  widthPct: number;
}

/** Bars grow from the centre: width = |v| × 50 % of the track. */
export function barGeometry(v: number): BarGeometry {
  const c = clampScore(v);
  const widthPct = Math.round(Math.abs(c) * 50 * 100) / 100;
  if (widthPct === 0) return { side: "zero", widthPct: 0 };
  return { side: c > 0 ? "pos" : "neg", widthPct };
}

export interface ScoreRow {
  key: "a_to_b" | "b_to_a" | "reinforcement";
  label: string;
  value: number;
  /** The direction(s) that set the minimum get the ink outline and the "Minimum" sub-label. */
  isMinimum: boolean;
  display: string;
}

export const SCORE_ROW_LABELS = {
  a_to_b: "A→B",
  b_to_a: "B→A",
  reinforcement: "Reinforcement",
} as const;

export const SCORE_ROW_DESCRIPTIONS = {
  a_to_b: "Automation feeds augmentation",
  b_to_a: "Augmentation feeds automation",
  reinforcement: "min(A→B, B→A)",
} as const;

export function pulseScoreRows(p: Pick<PulseResult, "a" | "b" | "reinforcement" | "weakerDirection">): ScoreRow[] {
  const minA = p.weakerDirection === "a_to_b" || p.weakerDirection === "both";
  const minB = p.weakerDirection === "b_to_a" || p.weakerDirection === "both";
  return [
    { key: "a_to_b", label: SCORE_ROW_LABELS.a_to_b, value: p.a, isMinimum: minA, display: formatSigned(p.a) },
    { key: "b_to_a", label: SCORE_ROW_LABELS.b_to_a, value: p.b, isMinimum: minB, display: formatSigned(p.b) },
    {
      key: "reinforcement",
      label: SCORE_ROW_LABELS.reinforcement,
      value: p.reinforcement,
      isMinimum: false,
      display: formatSigned(p.reinforcement),
    },
  ];
}

/** Text alternative for a set of score rows. */
export function scoreRowsSummary(rows: readonly ScoreRow[]): string {
  return rows
    .map((r) => `${r.label} ${r.display}${r.isMinimum ? " (minimum)" : ""}`)
    .join("; ");
}

export interface EpisodePoint {
  label: string;
  /** A→B on the x axis, −1..+1. */
  a: number;
  /** B→A on the y axis, −1..+1. */
  b: number;
}

/** Maps (a, b) in −1..+1 to SVG coordinates inside a square plot of `size` with `pad` margin. */
export function toPlot(a: number, b: number, size: number, pad: number): { x: number; y: number } {
  const inner = size - 2 * pad;
  return {
    x: pad + ((clampScore(a) + 1) / 2) * inner,
    y: pad + ((1 - clampScore(b)) / 2) * inner,
  };
}

/** Short quadrant name for direct labels (the part before the colon of the engine label). */
export function quadrantShortName(a: number, b: number): string {
  return QUADRANT_LABELS[quadrantOf(a, b)].split(":")[0] ?? "";
}

/** aria-label / caption text for the QuadrantChart. */
export function quadrantSummary(points: readonly EpisodePoint[]): string {
  if (points.length === 0) return "No episodes yet.";
  const parts = points.map(
    (p) => `${p.label}: A→B ${formatSigned(p.a)}, B→A ${formatSigned(p.b)}, reinforcement ${formatSigned(Math.min(p.a, p.b))}`,
  );
  const last = points[points.length - 1]!;
  return `${parts.join(". ")}. Latest: ${QUADRANT_LABELS[quadrantOf(last.a, last.b)]}.`;
}
