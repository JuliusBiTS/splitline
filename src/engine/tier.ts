/**
 * AIA-inspired indicative impact tier (SPEC §7.2, ADR-0004). Not an official AIA.
 * Reads only BaseFacts, never rule results (ADR-0007).
 */
import { REVERSIBILITY_LABELS, valueLabel } from "./labels";
import type {
  AffectedPeople,
  AiDecisionRole,
  BaseFacts,
  DataCategory,
  Reversibility,
  TierFactor,
  TierFactorKey,
  TierLevel,
  TierResult,
} from "./types";

export const TIER_LABEL = "AIA-inspired indicative tier" as const;

/**
 * Final weights (ADR-0004). Calibration on the four golden cases needed no change: every weight
 * equals the SPEC §7.2 table (delta 0, inside the ±1 bound).
 */
export const TIER_WEIGHTS = {
  aiDecisionRole: { informs: 1, recommends: 3, decides_with_review: 5, decides_alone: 8 } satisfies Record<
    AiDecisionRole,
    number
  >,
  consequential: { none: 0, consequential: 4 },
  dataSensitivity: {
    no_personal: 0,
    customer_pi: 2,
    financial: 3,
    employee_hr: 4,
    health: 5,
    biometric: 5,
    children: 5,
  } satisfies Record<DataCategory, number>,
  affectedPeople: { businesses_only: 0, public_customers: 2, employees_applicants: 3, patients: 4 } satisfies Record<
    AffectedPeople,
    number
  >,
  reversibility: { reversible_brief: 0, short_term: 2, hard_to_reverse: 4, irreversible: 6 } satisfies Record<
    Reversibility,
    number
  >,
  /** One point per derived scale/vulnerability condition (facts.ts), capped at 3. */
  scaleMax: 3,
  customerFacingGenerative: 2,
} as const;

/** AIA bands (research §2.5): fixed, never calibrated. Upper bounds in percent, inclusive. */
export const TIER_THRESHOLDS: ReadonlyArray<{ level: TierLevel; maxPct: number }> = [
  { level: "I", maxPct: 25 },
  { level: "II", maxPct: 50 },
  { level: "III", maxPct: 75 },
  { level: "IV", maxPct: 100 },
];

export const MITIGATION_DEDUCTION = 0.15;
export const MITIGATION_MIN_TICKED = 4; // of 5 (≥ 80 %)

const TIER_ORDER: readonly TierLevel[] = ["I", "II", "III", "IV"];

export function tierRank(level: TierLevel): number {
  return TIER_ORDER.indexOf(level) + 1;
}

const maxOf = (r: Record<string, number>): number => Math.max(...Object.values(r));

export const TIER_MAX_SCORE =
  maxOf(TIER_WEIGHTS.aiDecisionRole) +
  maxOf(TIER_WEIGHTS.consequential) +
  maxOf(TIER_WEIGHTS.dataSensitivity) +
  maxOf(TIER_WEIGHTS.affectedPeople) +
  maxOf(TIER_WEIGHTS.reversibility) +
  TIER_WEIGHTS.scaleMax +
  TIER_WEIGHTS.customerFacingGenerative;

/** Level from a score, comparing in integers-of-percent space to avoid float edge errors. */
export function levelFor(score: number, maxScore: number = TIER_MAX_SCORE): TierLevel {
  const scaled = Math.round(score * 100 * 1e6) / 1e6;
  for (const t of TIER_THRESHOLDS) {
    if (scaled <= t.maxPct * maxScore) return t.level;
  }
  return "IV";
}

const FACTOR_LABELS: Record<TierFactorKey, string> = {
  aiDecisionRole: "AI decision role",
  consequential: "Most consequential subtask",
  dataSensitivity: "Data sensitivity",
  affectedPeople: "Affected people",
  reversibility: "Reversibility",
  scale: "Scale and vulnerability",
  customerFacingGenerative: "Customer-facing generative output",
};

function maxBy<T extends string>(values: readonly T[], weights: Record<T, number>): { value?: T; points: number } {
  let best: { value?: T; points: number } = { points: 0 };
  for (const v of values) {
    const p = weights[v];
    if (best.value === undefined || p > best.points) best = { value: v, points: p };
  }
  return best;
}

export function computeTier(f: BaseFacts): TierResult {
  const data = maxBy(f.dataCategories, TIER_WEIGHTS.dataSensitivity);
  const affected = maxBy(f.affectedPeople, TIER_WEIGHTS.affectedPeople);
  const cfGen = f.customerFacingOutput && f.aiType === "generative_llm";

  const factors: TierFactor[] = [
    {
      key: "aiDecisionRole",
      label: FACTOR_LABELS.aiDecisionRole,
      valueLabel: valueLabel(f.aiDecisionRole),
      points: TIER_WEIGHTS.aiDecisionRole[f.aiDecisionRole],
      maxPoints: maxOf(TIER_WEIGHTS.aiDecisionRole),
    },
    {
      key: "consequential",
      label: FACTOR_LABELS.consequential,
      valueLabel: f.consequentialPresent
        ? `consequential (${f.consequentialSubtasks.map((s) => s.name).join(", ")})`
        : "none",
      points: f.consequentialPresent ? TIER_WEIGHTS.consequential.consequential : TIER_WEIGHTS.consequential.none,
      maxPoints: maxOf(TIER_WEIGHTS.consequential),
    },
    {
      key: "dataSensitivity",
      label: FACTOR_LABELS.dataSensitivity,
      valueLabel: data.value ? valueLabel(data.value) : "none",
      points: data.points,
      maxPoints: maxOf(TIER_WEIGHTS.dataSensitivity),
    },
    {
      key: "affectedPeople",
      label: FACTOR_LABELS.affectedPeople,
      valueLabel: affected.value ? valueLabel(affected.value) : "none",
      points: affected.points,
      maxPoints: maxOf(TIER_WEIGHTS.affectedPeople),
    },
    {
      key: "reversibility",
      label: FACTOR_LABELS.reversibility,
      valueLabel: REVERSIBILITY_LABELS[f.reversibility],
      points: TIER_WEIGHTS.reversibility[f.reversibility],
      maxPoints: maxOf(TIER_WEIGHTS.reversibility),
    },
    {
      key: "scale",
      label: FACTOR_LABELS.scale,
      valueLabel: `${f.scale} of ${TIER_WEIGHTS.scaleMax}`,
      points: Math.min(f.scale, TIER_WEIGHTS.scaleMax),
      maxPoints: TIER_WEIGHTS.scaleMax,
    },
    {
      key: "customerFacingGenerative",
      label: FACTOR_LABELS.customerFacingGenerative,
      valueLabel: cfGen ? "yes" : "no",
      points: cfGen ? TIER_WEIGHTS.customerFacingGenerative : 0,
      maxPoints: TIER_WEIGHTS.customerFacingGenerative,
    },
  ];

  const rawScore = factors.reduce((s, x) => s + x.points, 0);
  const mitigationDeductionApplied = f.mitigationCount >= MITIGATION_MIN_TICKED;
  const score = mitigationDeductionApplied ? rawScore * (1 - MITIGATION_DEDUCTION) : rawScore;
  const level = levelFor(score);
  const pct = (100 * score) / TIER_MAX_SCORE;

  // Top 3 contributing factors: highest points first, ties in table order; zero-point factors never count.
  const topFactors = factors
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.points > 0)
    .sort((a, b) => b.x.points - a.x.points || a.i - b.i)
    .slice(0, 3)
    .map(({ x }) => x.key);

  const rationale: string[] = topFactors.map((k) => {
    const x = factors.find((y) => y.key === k);
    return x ? `${x.label}: ${x.valueLabel} (+${x.points})` : k;
  });
  if (f.consequentialPresent) {
    rationale.push(
      `Consequential points come from: ${f.consequentialSubtasks.map((s) => `${s.name} (${s.id})`).join(", ")}.`,
    );
  } else if (f.confirmedNoConsequential) {
    rationale.push("You confirmed that no step bears on a decision about a person.");
  }
  if (f.reversibilityOverridden) {
    rationale.push(`Reversibility set by user: ${REVERSIBILITY_LABELS[f.reversibility]}.`);
  }
  if (mitigationDeductionApplied) {
    rationale.push(
      `${f.mitigationCount} of 5 mitigations ticked: raw score ${rawScore} reduced by 15% to ${round1(score)}.`,
    );
  }

  return {
    label: TIER_LABEL,
    level,
    rawScore,
    score,
    maxScore: TIER_MAX_SCORE,
    pct,
    mitigationDeductionApplied,
    factors,
    topFactors,
    rationale,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
