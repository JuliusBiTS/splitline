/**
 * Drift check on the KPI set (`02_*` §1.5, §3.6). Without a counterweight, organizations tilt toward
 * automation because its returns are easier to measure. The KPI set must include an efficiency KPI,
 * an augmentation-value KPI and a learning-loop KPI; a missing augmentation-value or learning-loop
 * KPI is a drift warning with suggested KPIs.
 *
 * KPIs are user-typed strings, classified with a fixed keyword lexicon (ADR-0016 §9).
 */
import type { KpiKind, OperatingModel } from "./types";

export type DriftCheck = OperatingModel["driftCheck"];

/** Keyword lexicon per KPI kind. Matching is case-insensitive on word starts. */
export const KPI_LEXICON: Record<KpiKind, readonly RegExp[]> = {
  learning_loop: [
    /\bcorrections?\b/i,
    /\bfed back\b/i,
    /\bfeedback\b/i,
    /\bsplit changes?\b/i,
    /\boverrides?\b/i,
    /\boverride rate\b/i,
    /\bretrain/i,
    /\brules? (?:added|updated|codified)\b/i,
    /\bcodifi/i,
    /\blessons?\b/i,
    /\blearning\b/i,
  ],
  augmentation_value: [
    /\bquality\b/i,
    /\bnon-routine\b/i,
    /\bunusual\b/i,
    /\bcomplex cases?\b/i,
    /\bdifficult cases?\b/i,
    /\bdecision accuracy\b/i,
    /\brework\b/i,
    /\bappeals? (?:upheld|overturned)\b/i,
    /\bjudgment\b/i,
    /\bexpert(?:ise)?\b/i,
  ],
  efficiency: [
    /\btime\b/i,
    /\bdays?\b/i,
    /\bhours?\b/i,
    /\bminutes?\b/i,
    /\bcycle\b/i,
    /\bthroughput\b/i,
    /\bcost\b/i,
    /\bstraight-through\b/i,
    /\bvolume\b/i,
    /\bper (?:case|claim|contract|hire|referral)\b/i,
    /\bproductivity\b/i,
    /\bbacklog\b/i,
  ],
};

/** Kinds a KPI string matches (a KPI may count for more than one kind). */
export function classifyKpi(kpi: string): KpiKind[] {
  return (Object.keys(KPI_LEXICON) as KpiKind[]).filter((k) => KPI_LEXICON[k].some((re) => re.test(kpi)));
}

/** Suggested KPIs per kind (`02_*` §3.6 examples). */
export const SUGGESTED_KPIS: Record<KpiKind, readonly string[]> = {
  efficiency: ["Cycle time per case", "Cost per case"],
  augmentation_value: [
    "Decision quality on non-routine cases (sampled expert review)",
    "Rework avoided on difficult cases",
  ],
  learning_loop: [
    "Corrections fed back into the system per month",
    "Split changes per quarter",
    "Override rate within the expected band",
  ],
};

export function driftCheck(proposedKpis: readonly string[]): DriftCheck {
  const kinds = new Set(proposedKpis.flatMap(classifyKpi));
  const missing = (["augmentation_value", "learning_loop"] as const).filter((k) => !kinds.has(k));
  return {
    ok: missing.length === 0,
    missing: [...missing],
    suggestedKpis: missing.flatMap((k) => SUGGESTED_KPIS[k]),
  };
}

export const DRIFT_WARNING =
  "Drift warning: without an augmentation-value and a learning-loop KPI, the measurable efficiency gains tend to pull the design toward automation alone.";
