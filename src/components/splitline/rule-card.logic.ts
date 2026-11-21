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
}

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
  };
}
