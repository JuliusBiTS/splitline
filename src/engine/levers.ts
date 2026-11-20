/**
 * The three design levers (`02_*` §1.4, §3.3–3.5; thesis Table 4) and the case-level scope notes
 * (`02_*` §1.10; SPEC §7.4). Each lever works only inside a guardrail that keeps its opposite, and
 * each has a direct cost on standalone performance that the card always shows (`02_*` §1.7).
 */
import { CADENCE_LABELS, SPLIT_REVIEW_QUESTIONS } from "./cadence";
import { isSafetyCritical, scopeSwitchApplies } from "./split";
import { tierRank } from "./tier";
import type { CaseFacts, LeverCard, LeverKey, OperatingModel, SplitReviewCadence } from "./types";

export const LEVER_NAMES: Record<LeverKey, string> = {
  decision_rights: "Decision rights (P1)",
  coordination: "Coordination (P2)",
  exchange: "Grouping and exchange (P3)",
};

/** The driver each lever primarily governs (`02_*` §1.4). */
export const LEVER_DRIVERS: Record<LeverKey, string> = {
  decision_rights: "Informed location of the split",
  coordination: "Adaptability of the split",
  exchange: "Reciprocal exchange",
};

/** Thesis Table 4: guardrail, signal to track, warning sign and direct cost per lever. */
export const TABLE_4: Record<
  LeverKey,
  { guardrail: string; monitoringIndicator: string; warningIndicator: string; directCost: string; beyondGuardrail: string }
> = {
  decision_rights: {
    guardrail: "Shared platform: common tools, common labels, and visible splits",
    monitoringIndicator: "Share of split decisions made at team level",
    warningIndicator: "Teams use different tools, with no visibility into one another's splits",
    directCost: "Automation efficiency: part of the cross-unit consistency and scale economies",
    beyondGuardrail: "Fragmented learning",
  },
  coordination: {
    guardrail: "Standardized base: agreed data formats, handoff points, and escalation thresholds",
    monitoringIndicator: "Number of split changes per task and quarter",
    warningIndicator: "The automation error rate rises because inputs become unstable",
    directCost: "Automation efficiency: attention and variance above the base",
    beyondGuardrail: "Base dissolves, automation becomes unstable",
  },
  exchange: {
    guardrail: "Retained differentiation: dedicated time for technical and for domain work",
    monitoringIndicator: "Number of corrections fed back into the system per month",
    warningIndicator: "Specialists lose depth",
    directCost: "Some standalone depth on each side",
    beyondGuardrail: "Expertise collapses",
  },
};

/** Thesis Table 4 note: the signals and warning signs are illustrative. */
export const LEVER_INDICATORS_LABEL =
  "Signals and warning signs are illustrative (thesis Table 4). A warning sign means the lever has been pushed past its guardrail.";

/** `02_*` §1.7: the trade-off is always shown, never hidden. */
export const TRADE_OFF_NOTE =
  "What this design costs: each lever is, in its direct effect, at best neutral and often costly for the standalone performance of at least one kind of work. The gain comes later and indirectly, through the reinforcement.";

/** SPEC §4 thesis scope disclosure (shown on the Operating model tab, the Pulse result and the Lab). */
export const THESIS_SCOPE_DISCLOSURE =
  "The thesis propositions are untested. The thesis model is firm-level; Splitline applies it at unit and use-case level, following Table 5 and the task-episode measure (Section 6.4).";

export const SHARED_PLATFORM_ITEMS = [
  "Common tooling across teams",
  "Common task labels",
  "A split register visible to other teams",
  "A change log for every split change",
] as const;

export const STANDARDIZED_BASE_ITEMS = [
  "Input and output schema",
  "Hand-off points between machine and human steps",
  "Escalation thresholds (confidence, value, case type)",
] as const;

export const CENTRAL_GUARDRAILS_SETTING =
  "Central guardrails, local proposals: the team proposes split changes and an accountable owner ratifies them.";

export const CRISIS_SETTING =
  "Temporary centralization: during the crisis, an accountable owner sets the split. This reverses P1; hand split decisions back to the team when the crisis ends.";

export const DEFAULT_DECISION_RIGHTS_SETTING =
  "The team that does the work sets and revises the split (P1), within a shared platform.";

export const GRADUAL_RAMP_SETTING =
  "Ramp up exchange gradually, enablement first: integration is bounded by the team's absorptive capacity.";

/** FED-DADM-HITL copy (ADR-0012, SPEC §7.4). Never reads as a legal requirement for non-federal organizations. */
export const HFD_NON_FEDERAL =
  "Human final decision (Splitline design setting at indicative tier III or IV). Reference: DADM Appendix C (mandatory for federal institutions only).";
export const HFD_FEDERAL =
  "If your official AIA returns Level III or IV, the Directive requires human intervention points and a human final decision. The indicative tier is not the official AIA level.";

function namesOf(facts: Pick<CaseFacts, "consequentialSubtasks">): string {
  return facts.consequentialSubtasks.map((s) => `${s.id} ${s.name}`).join(", ");
}

export function humanFinalDecisionRequired(facts: Pick<CaseFacts, "indicativeTier">): boolean {
  return tierRank(facts.indicativeTier) >= 3;
}

function decisionRightsCard(facts: CaseFacts): LeverCard {
  const t = TABLE_4.decision_rights;
  const central = scopeSwitchApplies(facts);
  const setting = facts.crisisContext ? CRISIS_SETTING : central ? CENTRAL_GUARDRAILS_SETTING : DEFAULT_DECISION_RIGHTS_SETTING;
  const details: string[] = [
    `Shared platform: ${SHARED_PLATFORM_ITEMS.join("; ")}.`,
    "Operators can override any machine output; every override is logged.",
    "Override rates far outside the expected band are a signal: very low suggests automation bias; very high suggests the model or the split is wrong.",
  ];
  if (facts.crisisContext && central)
    details.push(`After the crisis, return to: ${CENTRAL_GUARDRAILS_SETTING}`);
  if (humanFinalDecisionRequired(facts)) {
    const on = facts.consequentialSubtasks.length > 0 ? ` Applies to: ${namesOf(facts)}.` : "";
    details.push((facts.federalInstitution ? HFD_FEDERAL : HFD_NON_FEDERAL) + on);
  }
  return {
    lever: "decision_rights",
    setting,
    guardrail: t.guardrail,
    directCost: t.directCost,
    monitoringIndicator: t.monitoringIndicator,
    warningIndicator: t.warningIndicator,
    details,
  };
}

function coordinationCard(facts: CaseFacts, cadence: SplitReviewCadence): LeverCard {
  const t = TABLE_4.coordination;
  const details: string[] = [
    `Standardized base: ${STANDARDIZED_BASE_ITEMS.join("; ")}.`,
    `Each split review asks: ${SPLIT_REVIEW_QUESTIONS.join(" ")}`,
    `Dynamism is ${facts.dynamism}${facts.dynamismDerived ? " (derived from the AI type)" : ""}: the faster AI capability moves in this task domain, the more often the split is reviewed.`,
  ];
  const risky = facts.subtasks.filter((s) => s.errorCost === "high" || s.errorCost === "critical");
  if (risky.length > 0)
    details.push(
      `Set tighter escalation thresholds for steps with high or critical error cost: ${risky.map((s) => `${s.id} ${s.name}`).join(", ")}.`,
    );
  return {
    lever: "coordination",
    setting: `Mutual adjustment of the split within a standardized base; split review ${CADENCE_LABELS[cadence]}.`,
    guardrail: t.guardrail,
    directCost: t.directCost,
    monitoringIndicator: t.monitoringIndicator,
    warningIndicator: t.warningIndicator,
    details,
  };
}

const EXCHANGE_RHYTHM: Record<CaseFacts["teamSetup"], string> = {
  separate_ai_team: "Weekly joint working session between the AI team and the operating unit.",
  embedded: "A rotating AI steward inside the team, with regular joint sessions on the system's failures and edge cases.",
  vendor_run:
    "Regular joint working sessions with the vendor's delivery team; an internal AI steward owns the correction channel.",
};

function exchangeCard(facts: CaseFacts): LeverCard {
  const t = TABLE_4.exchange;
  const rhythm = EXCHANGE_RHYTHM[facts.teamSetup];
  const details: string[] = [
    "Correction channel: every human correction is captured in a structured form and flows back to the prompt, rules or model.",
    "Protected time for domain work (against deskilling) and for technical work.",
  ];
  if (facts.teamSetup === "vendor_run")
    details.push("Agree with the vendor how captured corrections reach the model or rules, and how often.");
  if (facts.readiness === "low")
    details.push(
      "Gradual ramp: start with enablement (how the system works, where it fails, how to log a correction), then fortnightly joint sessions, then the full rhythm once corrections flow.",
    );
  return {
    lever: "exchange",
    setting: facts.readiness === "low" ? `${GRADUAL_RAMP_SETTING} Target rhythm: ${rhythm}` : rhythm,
    guardrail: t.guardrail,
    directCost: t.directCost,
    monitoringIndicator: t.monitoringIndicator,
    warningIndicator: t.warningIndicator,
    details,
  };
}

export function computeLevers(facts: CaseFacts, cadence: SplitReviewCadence): OperatingModel["levers"] {
  return [decisionRightsCard(facts), coordinationCard(facts, cadence), exchangeCard(facts)];
}

export const CRISIS_SCOPE_NOTE =
  "Crisis context: temporary centralization of decision rights over the split. This reverses P1 (decentralized decision rights; thesis Section 5.4). Hand split decisions back to the team when the crisis ends.";

export const LOW_READINESS_SCOPE_NOTE =
  "Low readiness: integration is bounded by absorptive capacity, so exchange ramps up gradually, with enablement first.";

export function centralGuardrailsNote(facts: CaseFacts): string {
  const why = isSafetyCritical(facts) ? "safety-critical" : `at indicative tier ${facts.indicativeTier}`;
  return `Central guardrails, local proposals: the task knowledge here is codifiable and the case is ${why}, so central control over the split can be preferable (thesis Section 5.1). The team proposes split changes; an accountable owner ratifies them.`;
}

export function tierFloorNote(facts: CaseFacts): string {
  return `Indicative tier ${facts.indicativeTier}: steps that bear on the consequential decision stay at machine + human review or human, even as the split moves.`;
}

export function computeScopeNotes(facts: CaseFacts): string[] {
  const notes: string[] = [];
  if (scopeSwitchApplies(facts)) notes.push(centralGuardrailsNote(facts));
  if (facts.crisisContext) notes.push(CRISIS_SCOPE_NOTE);
  if (humanFinalDecisionRequired(facts)) notes.push(tierFloorNote(facts));
  if (facts.readiness === "low") notes.push(LOW_READINESS_SCOPE_NOTE);
  return notes;
}
