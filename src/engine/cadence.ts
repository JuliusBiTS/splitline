/**
 * Split review cadence by dynamism (`02_*` §3.4, P4) and the next review date (SPEC §7.4).
 * "Today" is injected; the engine never reads the clock (ADR-0016 §8).
 */
import type { Dynamism, SplitReviewCadence } from "./types";

/** Illustrative defaults from `02_*` §3.4 (editable later in the UI). */
export const CADENCE_BY_DYNAMISM: Record<Dynamism, SplitReviewCadence> = {
  high: "monthly",
  medium: "bimonthly",
  low: "quarterly",
};

export const CADENCE_MONTHS: Record<SplitReviewCadence, number> = { monthly: 1, bimonthly: 2, quarterly: 3 };

export const CADENCE_LABELS: Record<SplitReviewCadence, string> = {
  monthly: "monthly",
  bimonthly: "every 2 months",
  quarterly: "quarterly",
};

/** The three questions every split review asks (`02_*` §3.4). */
export const SPLIT_REVIEW_QUESTIONS = [
  "What is now automated?",
  "What is augmented?",
  "What did we learn?",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Adds calendar months to an ISO date, clamping the day to the target month's last day. */
export function addMonths(isoDate: string, months: number): string {
  const m = ISO_DATE.exec(isoDate);
  if (!m) throw new Error(`Invalid ISO date: ${isoDate}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const check = new Date(Date.UTC(y, mo, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo || check.getUTCDate() !== d)
    throw new Error(`Invalid ISO date: ${isoDate}`);
  const targetMonth = mo + months;
  const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, targetMonth, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

export function cadenceFor(dynamism: Dynamism): SplitReviewCadence {
  return CADENCE_BY_DYNAMISM[dynamism];
}

export function nextReviewDate(today: string, cadence: SplitReviewCadence): string {
  return addMonths(today, CADENCE_MONTHS[cadence]);
}
