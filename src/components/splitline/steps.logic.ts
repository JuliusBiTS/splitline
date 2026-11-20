/** Step state shared by Stepper and ProgressNarration. */
export type StepState = "done" | "current" | "pending";

/**
 * `current` is the index of the active step; `current >= count` means every step is done.
 * Negative values mean nothing has started.
 */
export function stepState(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "pending";
}

export const STEP_STATE_TEXT: Record<StepState, string> = {
  done: "done",
  current: "in progress",
  pending: "not started",
};
