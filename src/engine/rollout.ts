/**
 * 90-day rollout (SPEC §7.5, ADR-0016 §6). Three phases with deliverables, KPIs and gate criteria.
 * Deliverables come from the triggered rules and from the levers; the KPI set always has one
 * efficiency, one augmentation-value and one learning-loop KPI; the monitoring plan carries the
 * signal and warning sign of each lever (thesis Table 4).
 */
import { CADENCE_LABELS, SPLIT_REVIEW_QUESTIONS } from "./cadence";
import { classifyKpi, SUGGESTED_KPIS } from "./drift";
import { humanFinalDecisionRequired, SHARED_PLATFORM_ITEMS, STANDARDIZED_BASE_ITEMS } from "./levers";
import type {
  CaseFacts,
  Deliverable,
  KpiKind,
  LeverKey,
  LeverCard,
  MonitoringPlanItem,
  OperatingModel,
  RolloutKpi,
  RolloutPlan,
  RuleDefinition,
  TriggeredRule,
} from "./types";

export const ROLLOUT_PHASE_TITLES = {
  foundation: "Foundation & guardrails",
  shadow_pilot: "Shadow pilot & calibration",
  controlled_scale: "Controlled scale & audit",
} as const;

/** Likely owner role per lever deliverable (ADR-0018). Planning aid only. */
export function leverOwnerRole(lever: LeverKey, teamSetup: CaseFacts["teamSetup"]): string {
  if (lever === "decision_rights") return "Product owner";
  if (lever === "coordination") return "Product owner, with the AI team lead";
  return teamSetup === "vendor_run" ? "Internal AI steward, with the vendor" : teamSetup === "embedded" ? "AI steward in the team" : "AI team lead";
}

export const MODEL_OWNER_ROLE = "Product owner";

/** Fallback when a rule has no owner role yet (the catalogue test requires one for action/blocker rules). */
export const RULE_OWNER_FALLBACK = "Product owner, with your privacy or legal adviser";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2027-05-01" → "May 1, 2027" (pure; no Date). */
export function formatIsoDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

const KPI_KINDS: readonly KpiKind[] = ["efficiency", "augmentation_value", "learning_loop"];

/**
 * One distinct KPI per kind: the user's first unused KPI of that kind, else Splitline's first
 * suggestion. A KPI that matches two kinds fills only one slot.
 */
export function selectRolloutKpis(proposedKpis: readonly string[]): RolloutPlan["kpis"] {
  const used = new Set<string>();
  const pick = (kind: KpiKind): RolloutKpi => {
    const own = proposedKpis.find((k) => !used.has(k) && classifyKpi(k).includes(kind));
    if (own !== undefined) used.add(own);
    return own !== undefined
      ? { kind, name: own, fromUser: true }
      : { kind, name: SUGGESTED_KPIS[kind][0] ?? kind, fromUser: false };
  };
  const [e, a, l] = KPI_KINDS.map(pick);
  if (!e || !a || !l) throw new Error("unreachable");
  return [e, a, l];
}

const monitorOf = (l: LeverCard): MonitoringPlanItem => ({
  lever: l.lever,
  monitoringIndicator: l.monitoringIndicator,
  warningIndicator: l.warningIndicator,
});

export interface RolloutInput {
  facts: CaseFacts;
  triggeredRules: readonly TriggeredRule[];
  operatingModel: OperatingModel;
  catalogue: readonly RuleDefinition[];
}

export function computeRollout({ facts, triggeredRules, operatingModel, catalogue }: RolloutInput): RolloutPlan {
  const byId = new Map(catalogue.map((r) => [r.id, r]));
  const titleOf = (id: string) => byId.get(id)?.title ?? id;
  // Future rules carry their start date so a Days 1–30 task never reads as in force today (ADR-0018).
  const whenPrefix = (t: TriggeredRule) => {
    const date = byId.get(t.ruleId)?.effectiveDate;
    return t.effectiveStatus === "IN_FORCE_FUTURE" && date ? `Applies from ${formatIsoDateLong(date)}: ` : "";
  };
  const ruleOwner = (id: string) => byId.get(id)?.ownerRole ?? RULE_OWNER_FALLBACK;
  const leverOwner = (lever: LeverKey) => leverOwnerRole(lever, facts.teamSetup);
  const nameOf = new Map(facts.subtasks.map((s) => [s.id, s.name]));
  const blockers = triggeredRules.filter((t) => t.severity === "blocker");
  const actions = triggeredRules.filter((t) => t.severity === "action");
  const proposed = triggeredRules.filter((t) => t.effectiveStatus === "PROPOSED");
  const kpis = selectRolloutKpis(facts.proposedKpis);
  const kpiNames = kpis.map((k) => k.name);
  const [dr, co, ex] = operatingModel.levers;
  const humanSteps = operatingModel.split.filter((s) => s.owner === "human").map((s) => nameOf.get(s.subtaskId) ?? s.subtaskId);
  const machineSteps = operatingModel.split.filter((s) => s.owner === "machine").map((s) => nameOf.get(s.subtaskId) ?? s.subtaskId);

  // Days 1–30
  const foundation: Deliverable[] = [
    ...blockers.map((t) => ({
      text: `${whenPrefix(t)}Redesign for ${titleOf(t.ruleId)}: ${byId.get(t.ruleId)?.redesignPath ?? t.actions.join(" ")}`,
      source: { kind: "rule" as const, ruleId: t.ruleId },
      ownerRole: ruleOwner(t.ruleId),
    })),
    ...[...blockers, ...actions].map((t) => ({
      text: `${whenPrefix(t)}${titleOf(t.ruleId)}: ${t.actions.join(" ")}`,
      source: { kind: "rule" as const, ruleId: t.ruleId },
      ownerRole: ruleOwner(t.ruleId),
    })),
    {
      text: `Set up the shared platform: ${SHARED_PLATFORM_ITEMS.join("; ")}.`,
      source: { kind: "lever", lever: "decision_rights" }, ownerRole: leverOwner("decision_rights"),
    },
    { text: `Agree the standardized base: ${STANDARDIZED_BASE_ITEMS.join("; ")}.`, source: { kind: "lever", lever: "coordination" }, ownerRole: leverOwner("coordination") },
    facts.readiness === "low"
      ? {
          text: "Enablement first: how the system works, where it fails, and how to log a correction.",
          source: { kind: "lever", lever: "exchange" }, ownerRole: leverOwner("exchange"),
        }
      : { text: `Start the joint working rhythm: ${ex.setting}`, source: { kind: "lever", lever: "exchange" }, ownerRole: leverOwner("exchange") },
    {
      text: "Set up the correction channel: every human correction is captured in a structured form.",
      source: { kind: "lever", lever: "exchange" }, ownerRole: leverOwner("exchange"),
    },
    {
      text: `Publish the starting split in the split register, with the first split review on ${operatingModel.nextReviewDate}.`,
      source: { kind: "model" }, ownerRole: MODEL_OWNER_ROLE,
    },
  ];
  const foundationGates: string[] = [];
  if (blockers.length > 0) foundationGates.push("Every blocker is cleared through its redesign path before the shadow pilot starts.");
  if (actions.length > 0) foundationGates.push("Every condition has an owner and a dated plan.");
  foundationGates.push("Shared platform and standardized base are in place.", "Baseline measured for all three KPIs.");

  // Days 31–60
  const pilot: Deliverable[] = [
    {
      text: "Run the AI system in shadow mode next to the current process and compare its outputs on every step it does or drafts.",
      source: { kind: "model" }, ownerRole: MODEL_OWNER_ROLE,
    },
    { text: "Calibrate the escalation thresholds on the shadow-pilot errors.", source: { kind: "lever", lever: "coordination" }, ownerRole: leverOwner("coordination") },
    {
      text: "Review failures and edge cases in the joint sessions; feed corrections back through the correction channel.",
      source: { kind: "lever", lever: "exchange" }, ownerRole: leverOwner("exchange"),
    },
    { text: "Track overrides against the expected band.", source: { kind: "lever", lever: "decision_rights" }, ownerRole: leverOwner("decision_rights") },
  ];
  if (humanSteps.length > 0)
    pilot.push({ text: `Keep ${humanSteps.join(", ")} with people; the pilot collects evidence for the split review.`, source: { kind: "model" }, ownerRole: MODEL_OWNER_ROLE });
  const pilotGates = [
    "Automation error rate on shadow cases is within the agreed escalation thresholds.",
    "Corrections are captured and fed back.",
    "Override rate is within the expected band.",
  ];
  if (humanFinalDecisionRequired(facts)) pilotGates.push("A person makes the final decision on every consequential step.");

  // Days 61–90
  const scale: Deliverable[] = [
    {
      text:
        machineSteps.length > 0
          ? `Go live in controlled increments, starting with the steps the AI does alone (${machineSteps.join(", ")}).`
          : "Go live in controlled increments, with human review on every step.",
      source: { kind: "model" }, ownerRole: MODEL_OWNER_ROLE,
    },
    {
      text: `Hold the first split review (${CADENCE_LABELS[operatingModel.splitReviewCadence]}): ${SPLIT_REVIEW_QUESTIONS.join(" ")}`,
      source: { kind: "lever", lever: "coordination" }, ownerRole: leverOwner("coordination"),
    },
    { text: "Audit a sample of decisions against the conditions from Days 1–30.", source: { kind: "model" }, ownerRole: MODEL_OWNER_ROLE },
    ...[dr, co, ex].map((l) => ({
      text: `Monitor ${l.monitoringIndicator.toLowerCase()}; warning sign: ${l.warningIndicator.toLowerCase()}.`,
      source: { kind: "lever" as const, lever: l.lever }, ownerRole: leverOwner(l.lever),
    })),
    ...proposed.map((t) => ({
      text: `Prepare for (proposed): ${titleOf(t.ruleId)}.`,
      source: { kind: "rule" as const, ruleId: t.ruleId },
      ownerRole: ruleOwner(t.ruleId),
    })),
  ];
  const scaleGates = [
    "No lever warning sign is active.",
    "All three KPIs are reported, including augmentation value and the learning loop (drift check).",
    "The split review is held and logged in the change log.",
  ];

  return {
    phases: [
      { id: "foundation", days: "Days 1–30", title: ROLLOUT_PHASE_TITLES.foundation, deliverables: foundation, kpis: kpiNames, gateCriteria: foundationGates },
      { id: "shadow_pilot", days: "Days 31–60", title: ROLLOUT_PHASE_TITLES.shadow_pilot, deliverables: pilot, kpis: kpiNames, gateCriteria: pilotGates },
      { id: "controlled_scale", days: "Days 61–90", title: ROLLOUT_PHASE_TITLES.controlled_scale, deliverables: scale, kpis: kpiNames, gateCriteria: scaleGates },
    ],
    kpis,
    monitoringPlan: [monitorOf(dr), monitorOf(co), monitorOf(ex)],
  };
}
