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

/**
 * Manager-facing lever names (ADR-0018). The thesis names above stay in "Research basis", the
 * Pulse and the Lab; the main workspace view uses these.
 */
export const LEVER_PLAIN_NAMES: Record<LeverKey, string> = {
  decision_rights: "Who decides what the AI does",
  coordination: "How the team adjusts the split, and how often",
  exchange: "How your experts and the AI team learn from each other",
};

/**
 * The thesis direct cost (Table 4) in plain words, always shown on the main view next to the
 * estimates (`02_*` §1.7: never hidden). The verbatim Table 4 text stays in Research basis.
 */
export const DIRECT_COST_PLAIN: Record<LeverKey, string> = {
  decision_rights:
    "Some automation efficiency: you give up part of the consistency and scale you would get from one split shared by all teams.",
  coordination:
    "Some automation efficiency: the team spends attention adjusting the split, and outputs vary more above the fixed base.",
  exchange: "Some standalone depth on each side: experts and AI specialists spend time on each other's work.",
};

/** Thesis proposition behind each lever (`02_*` §1.4), shown in "Research basis". */
export const LEVER_PROPOSITIONS: Record<LeverKey, string> = {
  decision_rights: "Decentralized decision rights over the split (P1)",
  coordination: "Mutual adjustment instead of standardization (P2)",
  exchange: "Integration of automation and augmentation work (P3)",
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

/** Plain version of the scope disclosure, always visible on the Operating model tab (ADR-0018). */
export const THESIS_SCOPE_NOTE_PLAIN =
  "These settings come from a firm-level model in a master's thesis, applied here at team and use-case level. Its propositions are untested.";

/** The reinforcement in manager terms (ADR-0018); keeps both directions and the minimum rule (`02_*` §1.1–1.3). */
export const REINFORCEMENT_PLAIN =
  "Is the AI making your people better, and your people making the AI better? These three settings feed both directions. The weaker direction sets the result, so a strong one cannot make up for a weak one.";

/** Research-basis wording of the reinforcement (`02_*` §1.1–1.3). Never "technical readiness vs absorptive capacity". */
export const REINFORCEMENT_RESEARCH =
  "Reinforcement = min(A→B, B→A), each from −1 to +1. A→B (automation → augmentation): freed capacity, and data on where the machine does well or fails. B→A (augmentation → automation): expertise and corrections codified back into the pipeline. The minimum rule is non-compensatory: a strong direction cannot offset a weak one.";

/** Plain label for the illustrative signals (thesis Table 4 reference moves to Research basis). */
export const LEVER_INDICATORS_LABEL_PLAIN =
  "Signals and warning signs are illustrative, not validated. A warning sign means a setting has been pushed too far.";

/** Thesis references for the scope notes, shown in Research basis (`02_*` §1.10). */
export const SCOPE_NOTE_RESEARCH_REFS = [
  "Central guardrails, local proposals: where task knowledge is codifiable and the setting is safety-critical or heavily regulated, central control over the split can be preferable (thesis Section 5.1).",
  "Crisis context: temporary centralization can reverse P1, decentralized decision rights (thesis Section 5.4).",
  "Low readiness: absorptive capacity bounds how far integration can go, so exchange ramps up gradually (Cohen & Levinthal).",
] as const;

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

/** Where split decisions go after the crisis: back to the team, or back to central guardrails when the scope switch holds. */
function afterCrisis(central: boolean): string {
  return central
    ? "when the crisis ends, return to central guardrails, local proposals"
    : "hand split decisions back to the team when the crisis ends";
}

export function crisisSetting(central: boolean): string {
  return `Temporary centralization: during the crisis, an accountable owner sets the split. This reverses the usual rule that the team sets its own split; ${afterCrisis(central)}.`;
}

export const CRISIS_SETTING = crisisSetting(false);

export const DEFAULT_DECISION_RIGHTS_SETTING =
  "The team that does the work decides which steps the AI does, and changes that over time, using tools and labels shared with other teams.";

export const GRADUAL_RAMP_SETTING =
  "Ramp up joint work gradually, enablement first: the team can only take on as much as it can absorb.";

/** FED-DADM-HITL copy (ADR-0012, SPEC §7.4). Never reads as a legal requirement for non-federal organizations. */
export const HFD_NON_FEDERAL =
  "Human final decision (Splitline design setting at indicative tier III or IV). Reference: DADM Appendix C (mandatory for federal institutions only).";
export const HFD_FEDERAL =
  "If your official AIA returns Level III or IV, the Directive requires human intervention points and a human final decision. The indicative tier is not the official AIA level.";

function namesOf(facts: Pick<CaseFacts, "consequentialSubtasks">): string {
  return facts.consequentialSubtasks.map((s) => s.name).join(", ");
}

export function humanFinalDecisionRequired(facts: Pick<CaseFacts, "indicativeTier">): boolean {
  return tierRank(facts.indicativeTier) >= 3;
}

function decisionRightsCard(facts: CaseFacts): LeverCard {
  const t = TABLE_4.decision_rights;
  const central = scopeSwitchApplies(facts);
  const setting = facts.crisisContext ? crisisSetting(central) : central ? CENTRAL_GUARDRAILS_SETTING : DEFAULT_DECISION_RIGHTS_SETTING;
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

const DYNAMISM_PLAIN: Record<CaseFacts["dynamism"], string> = { high: "fast", medium: "at a moderate pace", low: "slowly" };

function coordinationCard(facts: CaseFacts, cadence: SplitReviewCadence): LeverCard {
  const t = TABLE_4.coordination;
  const details: string[] = [
    `Standardized base: ${STANDARDIZED_BASE_ITEMS.join("; ")}.`,
    `Each split review asks: ${SPLIT_REVIEW_QUESTIONS.join(" ")}`,
    `AI capability in this kind of task moves ${DYNAMISM_PLAIN[facts.dynamism]}${facts.dynamismDerived ? " (judged from the AI type)" : ""}: the faster it moves, the more often you re-check the split.`,
  ];
  const risky = facts.subtasks.filter((s) => s.errorCost === "high" || s.errorCost === "critical");
  if (risky.length > 0)
    details.push(
      `Set tighter escalation thresholds for steps with high or critical error cost: ${risky.map((s) => s.name).join(", ")}.`,
    );
  return {
    lever: "coordination",
    setting: `The team adjusts the split as it learns, on top of a fixed base of data formats, hand-off points and escalation thresholds. Re-check the split ${CADENCE_LABELS[cadence]}.`,
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

export function crisisScopeNote(central: boolean): string {
  const after = afterCrisis(central);
  return `Crisis context: temporary centralization. During the crisis, one accountable owner decides the split. This reverses the usual rule that the team sets its own split. ${after.charAt(0).toUpperCase()}${after.slice(1)}.`;
}

export const CRISIS_SCOPE_NOTE = crisisScopeNote(false);

export const LOW_READINESS_SCOPE_NOTE =
  "Low readiness: the team can only take on as much joint work as it can absorb, so joint work ramps up gradually, with enablement first.";

export function centralGuardrailsNote(facts: CaseFacts): string {
  const why = isSafetyCritical(facts) ? "safety-critical" : `at indicative tier ${facts.indicativeTier}`;
  return `Central guardrails, local proposals: the task knowledge here can be written down and the case is ${why}, so central control over the split can be preferable. The team proposes split changes; an accountable owner ratifies them.`;
}

export function tierFloorNote(facts: CaseFacts): string {
  return `Indicative tier ${facts.indicativeTier}: steps that bear on a decision about a person keep a person checking or doing them, even as the split moves.`;
}

export function computeScopeNotes(facts: CaseFacts): string[] {
  const notes: string[] = [];
  if (scopeSwitchApplies(facts)) notes.push(centralGuardrailsNote(facts));
  if (facts.crisisContext) notes.push(crisisScopeNote(scopeSwitchApplies(facts)));
  if (humanFinalDecisionRequired(facts)) notes.push(tierFloorNote(facts));
  if (facts.readiness === "low") notes.push(LOW_READINESS_SCOPE_NOTE);
  return notes;
}
