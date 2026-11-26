/**
 * Structured intake = every intake field except the free-text `processDescription` (ADR-0008).
 * Share links and `/api/narrate` carry only this. The engine never reads the description
 * (ADR-0006), so a fixed placeholder reproduces the full result.
 */
import { IntakeInputSchema, type IntakeInputRaw } from "./types";

export const IntakeStructuredSchema = IntakeInputSchema.omit({ processDescription: true });
export type IntakeStructured = typeof IntakeStructuredSchema._output;
export type IntakeStructuredRaw = typeof IntakeStructuredSchema._input;

/** Satisfies the 200-character minimum of `processDescription`; never shown and never read by the engine. */
export const DESCRIPTION_NOT_SENT =
  "The free-text process description was not sent with this case. Splitline keeps it only in the creator's browser. " +
  "The engine reads structured fields and the confirmed subtasks only, so the result is the same without it.";

export function intakeFromStructured(structured: IntakeStructuredRaw): IntakeInputRaw {
  return { ...structured, processDescription: DESCRIPTION_NOT_SENT };
}

export function toStructured(intake: IntakeInputRaw): IntakeStructuredRaw {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { processDescription, ...rest } = intake;
  return rest;
}
