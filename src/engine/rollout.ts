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

const KPI_KINDS: readonly KpiKind[] = ["efficiency", "augmentation_value", "learning_loop"];

/** One KPI per kind: the user's first KPI of that kind, else Splitline's first suggestion. */
export function selectRolloutKpis(proposedKpis: readonly string[]): RolloutPlan["kpis"] {
  const pick = (kind: KpiKind): RolloutKpi => {
    const own = proposedKpis.find((k) => classifyKpi(k).includes(kind));
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
  const blockers = triggeredRules.filter((t) => t.severity === "blocker");
  const actions = triggeredRules.filter((t) => t.severity === "action");
  const proposed = triggeredRules.filter((t) => t.effectiveStatus === "PROPOSED");
  const kpis = selectRolloutKpis(facts.proposedKpis);
  const kpiNames = kpis.map((k) => k.name);
  const [dr, co, ex] = operatingModel.levers;
  const humanSteps = operatingModel.split.filter((s) => s.owner === "human").map((s) => s.subtaskId);
  const machineSteps = operatingModel.split.filter((s) => s.owner === "machine").map((s) => s.subtaskId);

  // Days 1–30
  const foundation: Deliverable[] = [
    ...blockers.map((t) => ({
      text: `Redesign for ${titleOf(t.ruleId)}: ${byId.get(t.ruleId)?.redesignPath ?? t.actions.join(" ")}`,
      source: { kind: "rule" as const, ruleId: t.ruleId },
    })),
    ...[...blockers, ...actions].map((t) => ({
      text: `${titleOf(t.ruleId)}: ${t.actions.join(" ")}`,
      source: { kind: "rule" as const, ruleId: t.ruleId },
    })),
    {
      text: `Set up the shared platform: ${SHARED_PLATFORM_ITEMS.join("; ")}.`,
      source: { kind: "lever", lever: "decision_rights" },
    },
    { text: `Agree the standardized base: ${STANDARDIZED_BASE_ITEMS.join("; ")}.`, source: { kind: "lever", lever: "coordination" } },
    facts.readiness === "low"
      ? {
          text: "Enablement first: how the system works, where it fails, and how to log a correction.",
          source: { kind: "lever", lever: "exchange" },
        }
      : { text: `Start the exchange rhythm: ${ex.setting}`, source: { kind: "lever", lever: "exchange" } },
    {
      text: "Set up the correction channel: every human correction is captured in a structured form.",
      source: { kind: "lever", lever: "exchange" },
    },
    {
      text: `Publish the starting split in the split register, with the first split review on ${operatingModel.nextReviewDate}.`,
      source: { kind: "model" },
    },
  ];
  const foundationGates: string[] = [];
  if (blockers.length > 0) foundationGates.push("Every blocker is cleared through its redesign path before the shadow pilot starts.");
  if (actions.length > 0) foundationGates.push("Every condition has an owner and a dated plan.");
  foundationGates.push("Shared platform and standardized base are in place.", "Baseline measured for all three KPIs.");

  // Days 31–60
  const pilot: Deliverable[] = [
    {
      text: "Run the AI system in shadow mode next to the current process and compare outputs on every machine and machine + review step.",
      source: { kind: "model" },
    },
    { text: "Calibrate the escalation thresholds on the shadow-pilot errors.", source: { kind: "lever", lever: "coordination" } },
    {
      text: "Review failures and edge cases in the joint sessions; feed corrections back through the correction channel.",
      source: { kind: "lever", lever: "exchange" },
    },
    { text: "Track overrides against the expected band.", source: { kind: "lever", lever: "decision_rights" } },
  ];
  if (humanSteps.length > 0)
    pilot.push({ text: `Keep ${humanSteps.join(", ")} with people; the pilot collects evidence for the split review.`, source: { kind: "model" } });
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
          ? `Go live in controlled increments, starting with the machine steps (${machineSteps.join(", ")}).`
          : "Go live in controlled increments, with human review on every step.",
      source: { kind: "model" },
    },
    {
      text: `Hold the first split review (${CADENCE_LABELS[operatingModel.splitReviewCadence]}): ${SPLIT_REVIEW_QUESTIONS.join(" ")}`,
      source: { kind: "lever", lever: "coordination" },
    },
    { text: "Audit a sample of decisions against the conditions from Days 1–30.", source: { kind: "model" } },
    ...[dr, co, ex].map((l) => ({
      text: `Monitor ${l.monitoringIndicator.toLowerCase()}; warning sign: ${l.warningIndicator.toLowerCase()}.`,
      source: { kind: "lever" as const, lever: l.lever },
    })),
    ...proposed.map((t) => ({ text: `Prepare for (proposed): ${titleOf(t.ruleId)}.`, source: { kind: "rule" as const, ruleId: t.ruleId } })),
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
