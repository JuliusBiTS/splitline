/** Assembles the operating model (SPEC §7.4) from the split, levers, cadence and drift check. */
import { cadenceFor, nextReviewDate } from "./cadence";
import { driftCheck } from "./drift";
import { computeLevers, computeScopeNotes } from "./levers";
import { computeStartingSplit } from "./split";
import type { CaseFacts, OperatingModel } from "./types";

export function computeOperatingModel(facts: CaseFacts, today: string): OperatingModel {
  const cadence = cadenceFor(facts.dynamism);
  return {
    split: computeStartingSplit(facts),
    isStartingSplit: true,
    nextReviewDate: nextReviewDate(today, cadence),
    splitReviewCadence: cadence,
    levers: computeLevers(facts, cadence),
    driftCheck: driftCheck(facts.proposedKpis),
    scopeNotes: computeScopeNotes(facts),
  };
}
