/** Pure formatting helpers shared by the Splitline components. No locale or clock reads. */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2026-11-20" → "November 20, 2026". Deterministic (no Intl), so server and client match. */
export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${Number(m[3])}, ${m[1]}` : iso;
}

/** True minus sign (U+2212) for negative numbers, as the design requires. */
export const MINUS = "−";

/** Signed score with two decimals: +0.42, −0.15, 0.00. Rounds to 2 dp first so −0.001 shows 0.00. */
export function formatSigned(v: number): string {
  const r = Math.round(v * 100) / 100;
  if (r === 0) return "0.00";
  return `${r > 0 ? "+" : MINUS}${Math.abs(r).toFixed(2)}`;
}

/** Cents → "$277.00". Integer cents avoid float drift in sums. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? MINUS : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
