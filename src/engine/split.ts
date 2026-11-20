/**
 * Starting split (`02_*` §3.2, SPEC §7.4, ADR-0007 §6, ADR-0016 §1–4).
 *
 * Every §3.2 branch is evaluated; when several match, the most human owner wins. The tier override
 * (tier ≥ III: steps that bear on the consequential decision get at least machine + review) only
 * moves owners toward more human control. The result is always a *starting* split: the split moves.
 */
import { tierRank } from "./tier";
import type { CaseFacts, SplitItem, SplitOwner, Subtask, TierLevel } from "./types";

const OWNER_ORDER: readonly SplitOwner[] = ["machine", "machine_review", "human"];

export function ownerRank(o: SplitOwner): number {
  return OWNER_ORDER.indexOf(o);
}

export function moreHuman(a: SplitOwner, b: SplitOwner): SplitOwner {
  return ownerRank(a) >= ownerRank(b) ? a : b;
}

export const STARTING_SPLIT_LABEL = "Starting split: the split will move";

const ERROR_COST_RANK: Record<Subtask["errorCost"], number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** A step bears on the consequential decision when it is marked consequential (SPEC §7.4). */
export const bearsOnDecision = (s: Subtask): boolean => s.consequential;

/** A step *is* the consequential decision: consequential and high judgment (ADR-0016 §1). */
export const isTheDecision = (s: Subtask): boolean => s.consequential && s.judgmentIntensity === "high";

interface Match {
  owner: SplitOwner;
  reason: string;
}

/** All §3.2 branches (plus the tier override) that match a subtask, in heuristic order. */
export function matchBranches(s: Subtask, tier: TierLevel): Match[] {
  const m: Match[] = [];
  const t = tierRank(tier);
  if (s.volume === "high" && s.knowledgeType === "codifiable" && ERROR_COST_RANK[s.errorCost] <= 1 && !s.consequential)
    m.push({ owner: "machine", reason: "High volume, codifiable, error cost at most medium and not consequential." });
  if (s.consequential) m.push({ owner: "machine_review", reason: "Consequential step: a person reviews the output." });
  if (ERROR_COST_RANK[s.errorCost] >= 2)
    m.push({ owner: "machine_review", reason: `Error cost is ${s.errorCost}: a person reviews the output.` });
  if (t >= 3 && bearsOnDecision(s))
    m.push({
      owner: "machine_review",
      reason: `Indicative tier ${tier} and the step bears on the consequential decision: at least machine + human review.`,
    });
  if (s.errorCost === "critical" && s.knowledgeType === "tacit")
    m.push({ owner: "human", reason: "Critical error cost with tacit knowledge: a person does this step." });
  if (t >= 4 && isTheDecision(s))
    m.push({ owner: "human", reason: "At indicative tier IV this step is the consequential decision: a person makes it." });
  return m;
}

export const NO_BRANCH_REASON =
  "No heuristic branch matched: start with human review; the split review may move this step to machine.";

/** Starting owner for one subtask: the most human matching branch (ADR-0007 §6), else machine + review (ADR-0016 §2). */
export function startingOwner(s: Subtask, tier: TierLevel): SplitItem {
  const matches = matchBranches(s, tier);
  if (matches.length === 0) return { subtaskId: s.id, owner: "machine_review", reason: NO_BRANCH_REASON };
  const top = matches.reduce((acc, x) => (ownerRank(x.owner) > ownerRank(acc.owner) ? x : acc));
  return { subtaskId: s.id, owner: top.owner, reason: top.reason };
}

export function computeStartingSplit(facts: Pick<CaseFacts, "subtasks" | "indicativeTier">): SplitItem[] {
  return facts.subtasks.map((s) => startingOwner(s, facts.indicativeTier));
}

/**
 * Floor for later split moves (SPEC §7.4): moves may go either way, but at tier ≥ III a step that
 * bears on the consequential decision stays at machine + review or human.
 */
export function enforceSplitFloor(
  split: readonly SplitItem[],
  facts: Pick<CaseFacts, "subtasks" | "indicativeTier">,
): SplitItem[] {
  if (tierRank(facts.indicativeTier) < 3) return split.map((x) => ({ ...x }));
  const byId = new Map(facts.subtasks.map((s) => [s.id, s]));
  return split.map((x) => {
    const s = byId.get(x.subtaskId);
    if (s && bearsOnDecision(s) && x.owner === "machine")
      return {
        ...x,
        owner: "machine_review",
        reason: `Kept at machine + human review: at indicative tier ${facts.indicativeTier} this step bears on the consequential decision.`,
      };
    return { ...x };
  });
}

/**
 * Codifiable at case level (SPEC §7.4): every consequential subtask is codifiable. With no
 * consequential subtask, every subtask must be codifiable (ADR-0016 §4).
 */
export function isCaseCodifiable(subtasks: readonly Subtask[]): boolean {
  const consequential = subtasks.filter((s) => s.consequential);
  const pool = consequential.length > 0 ? consequential : subtasks;
  return pool.length > 0 && pool.every((s) => s.knowledgeType === "codifiable");
}

/** Safety-critical (SPEC §7.4): any critical error cost, or the clinical-triage pattern. */
export function isSafetyCritical(facts: Pick<CaseFacts, "subtasks" | "useCasePatterns">): boolean {
  return facts.subtasks.some((s) => s.errorCost === "critical") || facts.useCasePatterns.includes("clinical_triage");
}

/** Scope switch (`02_*` §1.10, §3.3): codifiable AND (safety-critical OR tier ≥ III). */
export function scopeSwitchApplies(facts: Pick<CaseFacts, "subtasks" | "useCasePatterns" | "indicativeTier">): boolean {
  return isCaseCodifiable(facts.subtasks) && (isSafetyCritical(facts) || tierRank(facts.indicativeTier) >= 3);
}
