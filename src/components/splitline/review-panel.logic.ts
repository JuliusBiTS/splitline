/** ReviewPanel logic (Living Lab): keyboard shortcuts and the total-vs-lines check. */
import { formatCents } from "./format";

export type ReviewAction =
  | { type: "accept" }
  | { type: "correct" }
  | { type: "escalate" }
  | { type: "reason"; code: ReasonCode }
  | { type: "next" }
  | { type: "previous" };

export const REASON_CODES = [
  { code: 1, label: "Total mismatch" },
  { code: 2, label: "Illegible" },
  { code: 3, label: "Duplicate claim" },
  { code: 4, label: "Out of policy" },
  { code: 5, label: "Other" },
] as const;
export type ReasonCode = (typeof REASON_CODES)[number]["code"];

export const KEYBOARD_LEGEND = [
  { keys: ["A"], label: "Accept AI" },
  { keys: ["C"], label: "Correct" },
  { keys: ["E"], label: "Escalate" },
  { keys: ["1–5"], label: "Reason code" },
  { keys: ["J", "K"], label: "Next / previous" },
] as const;

export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** Tag name of the event target, e.g. "INPUT". */
  targetTag?: string;
  targetIsContentEditable?: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Maps a key press to a review action. Returns null while the user types in a field or holds a
 * modifier, so shortcuts never steal typing or browser shortcuts (WCAG 2.1.4).
 */
export function reviewKeyAction(e: KeyInput): ReviewAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.targetIsContentEditable || (e.targetTag && TYPING_TAGS.has(e.targetTag.toUpperCase()))) return null;
  const k = e.key.toLowerCase();
  if (k === "a") return { type: "accept" };
  if (k === "c") return { type: "correct" };
  if (k === "e") return { type: "escalate" };
  if (k === "j") return { type: "next" };
  if (k === "k") return { type: "previous" };
  const n = Number(k);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return { type: "reason", code: n as ReasonCode };
  return null;
}

export interface TotalCheck {
  sumCents: number;
  totalCents: number;
  diffCents: number;
  mismatch: boolean;
  /** "Lines sum to $277.00 (difference $12.00)" */
  message: string;
}

export function checkTotal(lineCents: readonly number[], totalCents: number): TotalCheck {
  const sumCents = lineCents.reduce((s, x) => s + x, 0);
  const diffCents = totalCents - sumCents;
  return {
    sumCents,
    totalCents,
    diffCents,
    mismatch: diffCents !== 0,
    message: `Lines sum to ${formatCents(sumCents)} (difference ${formatCents(Math.abs(diffCents))})`,
  };
}
