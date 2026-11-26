/** RuleCard view model: engine `TriggeredRule` + catalogue `RuleMeta` → display fields. */
import type { RuleMeta, TriggeredRule } from "@/engine/types";
import { formatIsoDate } from "./format";
import { statusBadgeFor, type StatusBadgeModel } from "./status-badge.logic";

export type RuleSource = RuleMeta["sources"][number];

export interface RuleCardModel {
  ruleId: string;
  badge: StatusBadgeModel;
  /** One-line headline in the collapsed row. */
  title: string;
  /** "Why this applies": the matched intake facts and case notes. */
  why: string[];
  /** Regulator or legislature wording behind the rule. */
  consideration: string;
  /** "Consider": actions phrased as considerations, never "you must". */
  consider: string[];
  redesignPath?: string;
  instrument: string;
  sources: RuleSource[];
  /** "Verified November 20, 2026" */
  verifiedLabel: string;
  /** Planning aid (ADR-0018): likely owner role and rough effort, e.g. "Medium (1–3 weeks)". */
  ownerRole?: string;
  effortLabel?: string;
}

/** Rough effort bands (ADR-0018). Planning estimates only. */
export const EFFORT_LABELS: Record<NonNullable<RuleMeta["effort"]>, string> = {
  small: "small (days)",
  medium: "medium (1–3 weeks)",
  large: "large (a month or more)",
};

/** Shown once under every list of conditions with owners and effort. */
export const PLANNING_ESTIMATE_NOTE =
  "Owners and effort are rough planning estimates, not legal advice. Confirm with your privacy office or counsel.";

export function ruleCardModel(t: TriggeredRule, meta: RuleMeta): RuleCardModel {
  return {
    ruleId: t.ruleId,
    badge: statusBadgeFor({ effectiveStatus: t.effectiveStatus, severity: t.severity, inScope: t.inScope, rule: meta }),
    title: meta.title,
    why: [...t.matchedFacts, ...t.notes],
    consideration: meta.consideration,
    consider: t.actions,
    redesignPath: t.severity === "blocker" ? meta.redesignPath : undefined,
    instrument: meta.instrument,
    sources: meta.sources,
    verifiedLabel: `Verified ${formatIsoDate(meta.lastVerified)}`,
    ownerRole: meta.ownerRole,
    effortLabel: meta.effort ? EFFORT_LABELS[meta.effort] : undefined,
  };
}
