/**
 * Workspace view model (server side): runs the engine on a preset at build time and shapes the
 * result for the tabs. Pure: "today" is the fixed `PRESET_AS_OF`, so static pages are reproducible.
 */
import { ruleCardModel, type RuleCardModel } from "@/components/splitline/rule-card.logic";
import { getRule } from "@/content/rules";
import { computeCase, type EngineResult } from "@/engine";
import { TIER_LABEL } from "@/engine/tier";
import type { ConfirmedDecomposition, IntakeInputRaw, Preset } from "@/engine/types";

/** The date preset results are computed for (split review dates count from it). */
export const PRESET_AS_OF = "2026-11-20";

export function computePreset(preset: Pick<Preset, "intake" | "decomposition">): EngineResult {
  return computeCase(preset.intake, preset.decomposition, { today: PRESET_AS_OF });
}

/** RuleCard models for the given rule IDs, in that order (unknown IDs are skipped). */
export function ruleCardsFor(result: EngineResult, ids?: readonly string[]): RuleCardModel[] {
  const order = ids ?? result.triggeredRules.map((t) => t.ruleId);
  return order.flatMap((id) => {
    const t = result.triggeredRules.find((x) => x.ruleId === id);
    const meta = getRule(id);
    return t && meta ? [ruleCardModel(t, meta)] : [];
  });
}

/** All triggered rules, most severe first (blocker → action → info), catalogue order within. */
export function rulesBySeverity(result: EngineResult): RuleCardModel[] {
  const rank = { blocker: 0, action: 1, info: 2 } as const;
  const sorted = [...result.triggeredRules].sort((a, b) => rank[a.severity] - rank[b.severity]);
  return ruleCardsFor(
    result,
    sorted.map((t) => t.ruleId),
  );
}

/**
 * Plain explanation of the verdict for live cases (presets carry an authored one). Built only from
 * engine output, so it never invents a reason; legal microcopy stays "likely" (CLAUDE.md).
 */
export function verdictReason(result: EngineResult): string {
  const title = (id: string) => getRule(id)?.title ?? "a triggered rule";
  const blockers = result.triggeredRules.filter((t) => t.severity === "blocker");
  const actions = result.triggeredRules.filter((t) => t.severity === "action");
  const tier = `The ${TIER_LABEL} is ${result.tier.level}.`;
  if (blockers.length > 0) {
    const names = blockers.slice(0, 2).map((t) => title(t.ruleId).replace(/\.$/, ""));
    const fix =
      result.verdict.verdict === "stop"
        ? "At least one has no redesign path in the catalogue, so reconsider the use case as described."
        : "Each one names a redesign path in the Triage tab; plan that before a pilot.";
    return `${blockers.length === 1 ? "One rule likely blocks" : `${blockers.length} rules likely block`} this design as described: ${names.join("; ")}. ${fix} ${tier}`;
  }
  if (actions.length > 0) {
    const top = result.verdict.topConditions[0];
    return `${actions.length === 1 ? "One condition likely applies" : `${actions.length} conditions likely apply`} before a pilot${
      top ? `, led by: ${title(top).replace(/\.$/, "")}` : ""
    }. None of them blocks the design as described. ${tier}`;
  }
  return `No rule here likely adds a condition before a pilot; the Triage tab lists good-practice items to consider. ${tier}`;
}


export function subtaskNames(decomposition: ConfirmedDecomposition): Map<string, string> {
  return new Map(decomposition.subtasks.map((s) => [s.id, s.name]));
}

/** SPEC §11 inventory record (ISO/IEC 42001-style). Structured data only, no free text. */
export interface InventoryRecord {
  useCaseId: string;
  title: string;
  owner: string;
  orgType: string;
  aiType: string;
  aiDecisionRole: string;
  dataCategories: string[];
  hosting: string;
  indicativeTier: string;
  verdict: string;
  triggeredRuleIds: string[];
  splitReviewCadence: string;
  nextReviewDate: string;
  createdAt: string;
  engineVersion: string;
  ruleCatalogueVersion: string;
}

export function inventoryRecord(
  useCaseId: string,
  intake: Pick<IntakeInputRaw, "title" | "orgType" | "aiType" | "aiDecisionRole" | "dataCategories" | "hosting">,
  result: EngineResult,
  createdAt: string,
): InventoryRecord {
  return {
    useCaseId,
    title: intake.title,
    owner: "(to be assigned)",
    orgType: intake.orgType,
    aiType: intake.aiType,
    aiDecisionRole: intake.aiDecisionRole,
    dataCategories: [...intake.dataCategories],
    hosting: intake.hosting,
    indicativeTier: result.tier.level,
    verdict: result.verdict.verdict,
    triggeredRuleIds: result.triggeredRules.map((t) => t.ruleId),
    splitReviewCadence: result.operatingModel.splitReviewCadence,
    nextReviewDate: result.operatingModel.nextReviewDate,
    createdAt,
    engineVersion: result.engineVersion,
    ruleCatalogueVersion: result.ruleCatalogueVersion,
  };
}
