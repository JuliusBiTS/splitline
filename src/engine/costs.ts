/**
 * Case-specific cost estimates (ADR-0018). The thesis direct cost of each lever (`02_*` §1.7,
 * thesis Table 4) stays on every LeverCard as `directCost`; these lines translate it into
 * operational terms a manager can plan with. Every line is a rough estimate derived only from
 * intake facts (team setup, readiness, crisis flag), the review cadence and the starting split.
 * Pure and deterministic: no clock, no randomness.
 */
import { humanFinalDecisionRequired } from "./levers";
import { scopeSwitchApplies } from "./split";
import type { CaseFacts, CostEstimate, SplitItem, SplitReviewCadence, Subtask } from "./types";

/** Shown once under every list of cost estimates. */
export const COST_ESTIMATE_NOTE =
  "Estimates are Splitline's own rough figures, not findings from the thesis. They assume a unit of about 5–15 people; adjust them to your team.";

/** "a", "a and b", "a, b and c". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const REGISTER_LINE =
  "Keeping the shared platform in place: about 1 hour a week for the product owner to keep the split register and change log up to date.";

const SPLIT_REVIEW_LINE: Record<SplitReviewCadence, string> = {
  monthly:
    "A monthly split review of about 2 hours with the team lead, the product owner and one AI team member: roughly 6 person-hours a month.",
  bimonthly:
    "A split review every 2 months of about 2 hours with the team lead, the product owner and one AI team member: roughly 3 person-hours a month.",
  quarterly:
    "A quarterly split review of about half a day with the team lead, the product owner and one AI team member: roughly 4 person-hours a month.",
};

const EXCHANGE_LINES: Record<CaseFacts["teamSetup"], string[]> = {
  separate_ai_team: [
    "A weekly 1-hour joint session for 2–3 domain experts and 1–2 AI team members: roughly 3–5 person-hours a week, plus time to log corrections.",
    "Experts give up some throughput and the AI team some build time; each side may lose some specialist depth.",
  ],
  embedded: [
    "A rotating AI steward inside the team for about half a day a week, plus a 1-hour joint session every two weeks: roughly 5–7 person-hours a week.",
    "Experts give up some throughput and the steward some domain work; each side may lose some specialist depth.",
  ],
  vendor_run: [
    "A 1-hour joint session with the vendor's team every two weeks for 2–3 domain experts, plus about half a day a week for an internal AI steward.",
    "Experts give up some throughput, and each side may lose some specialist depth; vendor session time may be billable.",
  ],
};

const ENABLEMENT_LINE =
  "Enablement first: 2–3 half-day sessions in Days 1–30 before the full rhythm starts, so joint work ramps up more slowly.";

function stepNames(facts: CaseFacts, split: readonly SplitItem[], owner: SplitItem["owner"]): Subtask[] {
  const byId = new Map(facts.subtasks.map((s) => [s.id, s]));
  return split.filter((x) => x.owner === owner).flatMap((x) => byId.get(x.subtaskId) ?? []);
}

function decisionRightsLines(facts: CaseFacts): string[] {
  const central = scopeSwitchApplies(facts);
  const lines: string[] = [];
  if (facts.crisisContext)
    lines.push(
      "During the crisis, one accountable owner sets the split: decisions are faster, but the team's knowledge of where the AI fails is used less.",
    );
  else if (central)
    lines.push(
      "An accountable owner reviews and ratifies each proposed split change, about 1 hour per split review, so changes take longer to agree.",
    );
  else lines.push("Because this team sets its own split, some consistency and reuse with other teams is lost.");
  lines.unshift(REGISTER_LINE);
  if (humanFinalDecisionRequired(facts) && facts.consequentialSubtasks.length > 0)
    lines.push(
      `A person makes the final decision on ${joinNames(facts.consequentialSubtasks.map((s) => s.name))}, so these steps never run straight through.`,
    );
  return lines;
}

function coordinationLines(facts: CaseFacts, split: readonly SplitItem[], cadence: SplitReviewCadence): string[] {
  const lines = [SPLIT_REVIEW_LINE[cadence]];
  const machine = stepNames(facts, split, "machine");
  lines.push(
    machine.length > 0
      ? `A slower start: ${joinNames(machine.map((s) => s.name))} ${machine.length === 1 ? "runs" : "run"} without a person only from Day 61. Until then the AI runs in shadow next to the current process, so straight-through processing stays at zero for the first 60 days.`
      : "No step runs without a person in this starting split, so expect no straight-through processing in the first 90 days.",
  );
  const risky = facts.subtasks.filter((s) => s.errorCost === "high" || s.errorCost === "critical");
  if (risky.length > 0)
    lines.push(
      `Escalation thresholds need calibrating during the shadow pilot on ${risky.length === 1 ? "1 step" : `${risky.length} steps`} with high or critical error cost.`,
    );
  return lines;
}

function exchangeLines(facts: CaseFacts): string[] {
  const lines = [...EXCHANGE_LINES[facts.teamSetup]];
  if (facts.readiness === "low") lines.push(ENABLEMENT_LINE);
  return lines;
}

const VOLUME_ORDER: readonly Subtask["volume"][] = ["high", "medium", "low"];

function reviewLines(facts: CaseFacts, split: readonly SplitItem[]): string[] {
  const reviewed = stepNames(facts, split, "machine_review");
  const human = stepNames(facts, split, "human");
  const lines: string[] = [];
  if (reviewed.length > 0) {
    const groups = VOLUME_ORDER.flatMap((v) => {
      const names = reviewed.filter((s) => s.volume === v).map((s) => s.name);
      return names.length > 0 ? [`${joinNames(names)} (${v} volume)`] : [];
    });
    const n = reviewed.length === 1 ? "1 step" : `${reviewed.length} steps`;
    lines.push(`A person checks and signs off every AI output on ${n}: ${groups.join("; ")}.`);
    lines.push(
      reviewed.some((s) => s.volume === "high")
        ? "Review on high-volume steps is likely the largest ongoing time cost. Measure it in the shadow pilot."
        : "Measure review time in the shadow pilot before you plan staffing.",
    );
  }
  if (human.length > 0)
    lines.push(
      `People keep doing ${human.length === 1 ? "1 step" : `${human.length} steps`} themselves (${joinNames(human.map((s) => s.name))}); the AI may assist, but saves little time there.`,
    );
  return lines;
}

/**
 * One estimate per lever, always (the direct cost is never hidden), plus a "review" estimate for
 * the people who check AI output when the split has any machine + review or human step.
 */
export function computeCostEstimates(
  facts: CaseFacts,
  split: readonly SplitItem[],
  cadence: SplitReviewCadence,
): CostEstimate[] {
  const out: CostEstimate[] = [
    { topic: "decision_rights", lines: decisionRightsLines(facts) },
    { topic: "coordination", lines: coordinationLines(facts, split, cadence) },
    { topic: "exchange", lines: exchangeLines(facts) },
  ];
  const review = reviewLines(facts, split);
  if (review.length > 0) out.push({ topic: "review", lines: review });
  return out;
}
