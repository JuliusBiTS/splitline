/**
 * Reinforcement Pulse scoring (`02_*` §3.7, thesis Table 5 and Figure 2; SPEC §7.7; ADR-0009, ADR-0016 §7).
 *
 * - Direction score = (mean − 4) / 3, from −1 to +1.
 * - Reinforcement = min(A→B, B→A): a strong direction cannot offset a weak one.
 * - The lowest D item names the lagging driver, mapped to its lever and guardrail (Table 4).
 *
 * MVP adaptation (ADR-0009): one respondent answers all nine items; the role is context only and
 * the result is a single-perspective estimate.
 */
import { LEVER_NAMES, TABLE_4, THESIS_SCOPE_DISCLOSURE } from "./levers";
import {
  PulseInputSchema,
  type LeverKey,
  type PulseDriver,
  type PulseInput,
  type PulseQuadrant,
  type PulseResult,
  type PulseRole,
} from "./types";

export const PULSE_SHORT_LABEL = "illustrative, not validated" as const;
export const PULSE_FOOTNOTE = "Illustrative instrument from a conceptual thesis; not psychometrically validated." as const;
export const PULSE_PERSPECTIVE_LABEL = "single-perspective estimate" as const;

export const PULSE_ROLE_LABELS: Record<PulseRole, string> = {
  augmentation_work: "augmentation work",
  ai_team: "AI team",
  lead: "lead",
};

export const PULSE_ROLE_NOTE =
  "Table 5 intends A items for augmentation staff, B items for the AI team, and D items for both; the other side may see it differently.";

/** D items → the driver they check → the lever that governs that driver (thesis Table 4). */
export const DRIVER_LEVER: Record<PulseDriver, LeverKey> = {
  D1: "decision_rights",
  D2: "coordination",
  D3: "exchange",
};

export const QUADRANT_LABELS: Record<PulseQuadrant, string> = {
  virtuous: "Virtuous: both directions feed each other",
  one_sided: "One-sided: one direction erodes the other, so the reinforcement is negative despite the strong side",
  one_way_limit: "One-way limit case: one direction feeds, the other is flat, so the reinforcement is zero",
  vicious: "Vicious: neither direction feeds the other",
};

/**
 * (mean − 4) / 3 on a 1–7 scale → −1 to +1. Computed as (sum − 4n) / 3n so the numerator is an
 * exact integer: a mean of exactly 4 scores exactly 0 (the half-axes depend on it).
 */
export function directionScore(items: readonly number[]): number {
  const sum = items.reduce((s, x) => s + x, 0);
  return (sum - 4 * items.length) / (3 * items.length);
}

/** Quadrant per `02_*` §3.7 and Figure 2 (ADR-0016 §7). */
export function quadrantOf(a: number, b: number): PulseQuadrant {
  if (a > 0 && b > 0) return "virtuous";
  if ((a === 0 && b > 0) || (b === 0 && a > 0)) return "one_way_limit";
  if (a <= 0 && b <= 0) return "vicious";
  return "one_sided";
}

export function scorePulse(input: PulseInput): PulseResult {
  const p = PulseInputSchema.parse(input);
  const a = directionScore([p.A1, p.A2, p.A3]);
  const b = directionScore([p.B1, p.B2, p.B3]);
  const reinforcement = Math.min(a, b);
  const drivers: PulseDriver[] = ["D1", "D2", "D3"];
  const lowest = Math.min(...drivers.map((d) => p[d]));
  const laggingDrivers = drivers
    .filter((d) => p[d] === lowest)
    .map((d) => {
      const lever = DRIVER_LEVER[d];
      return {
        item: d,
        score: p[d],
        lever,
        leverName: LEVER_NAMES[lever],
        guardrail: TABLE_4[lever].guardrail,
        // `02_*` §1.7: a recommended lever always travels with its direct cost.
        directCost: TABLE_4[lever].directCost,
      };
    });
  return {
    a,
    b,
    reinforcement,
    weakerDirection: a < b ? "a_to_b" : b < a ? "b_to_a" : "both",
    quadrant: quadrantOf(a, b),
    laggingDrivers,
    driverCheckRelevant: reinforcement <= 0,
    role: p.role,
    labels: {
      short: PULSE_SHORT_LABEL,
      footnote: PULSE_FOOTNOTE,
      perspective: PULSE_PERSPECTIVE_LABEL,
      roleNote: PULSE_ROLE_NOTE,
      scopeDisclosure: THESIS_SCOPE_DISCLOSURE,
    },
  };
}
