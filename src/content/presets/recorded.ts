/**
 * Recorded LLM runs for the presets (PLAN Phase 5, ADR-0019). Each recording keeps:
 * - the raw decomposition the model proposed (with its source quotes), model ID and date;
 * - the confirmation edits a reviewer made in step 3 ("Confirm split"), each with a reason;
 * - the guarded narrative for the confirmed case.
 *
 * The preset's `decomposition` must equal `applyConfirmationEdits(raw, edits)` (tested), so every
 * difference between what the model proposed and what the engine reads is visible and justified.
 */
import { z } from "zod";
import {
  DecompositionSchema,
  NarrativeSchema,
  NarrativeSourceSchema,
  SubtaskSchema,
  type ConfirmedDecomposition,
  type Decomposition,
} from "@/engine/types";

const EditableField = z.enum([
  "name",
  "description",
  "judgmentIntensity",
  "knowledgeType",
  "errorCost",
  "volume",
  "affectsIndividuals",
  "consequential",
  "rationale",
]);

export const ConfirmationEditSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set"),
    subtaskId: z.string(),
    field: EditableField,
    value: z.union([z.string(), z.boolean()]),
    reason: z.string().min(1),
  }),
  /** Removes a proposed subtask; the remaining ones are renumbered s1… in order. */
  z.object({ op: z.literal("remove"), subtaskId: z.string(), reason: z.string().min(1) }),
  /** Adds a subtask the proposal missed, after `afterSubtaskId` (or first). Renumbered with the rest. */
  z.object({
    op: z.literal("add"),
    afterSubtaskId: z.string().nullable(),
    subtask: SubtaskSchema.omit({ id: true }),
    reason: z.string().min(1),
  }),
  z.object({ op: z.literal("confirmNoConsequential"), reason: z.string().min(1) }),
  /** Removes a proposed assumption (matched by its exact text). */
  z.object({ op: z.literal("removeAssumption"), text: z.string(), reason: z.string().min(1) }),
]);
export type ConfirmationEdit = z.infer<typeof ConfirmationEditSchema>;

export const PresetRecordingSchema = z.object({
  slug: z.string(),
  model: z.string(),
  decompose: z.object({
    recordedAt: z.iso.date(),
    attempts: z.number().int().min(1),
    decomposition: DecompositionSchema,
    grounding: z.array(z.object({ subtaskId: z.string(), sourceQuote: z.string() })),
  }),
  confirmationEdits: z.array(ConfirmationEditSchema),
  narrate: z
    .object({
      recordedAt: z.iso.date(),
      attempts: z.number().int().min(1),
      source: NarrativeSourceSchema,
      narrative: NarrativeSchema,
      engineVersion: z.string(),
      ruleCatalogueVersion: z.string(),
    })
    .optional(),
});
export type PresetRecording = z.infer<typeof PresetRecordingSchema>;

type WorkingSubtask = Omit<Decomposition["subtasks"][number], "id"> & { id: string };

export function applyConfirmationEdits(raw: Decomposition, edits: readonly ConfirmationEdit[]): ConfirmedDecomposition {
  let subtasks: WorkingSubtask[] = raw.subtasks.map((s) => ({ ...s }));
  let confirmedNoConsequential = false;
  let added = 0;
  let assumptions = [...raw.assumptions];
  for (const e of edits) {
    switch (e.op) {
      case "set": {
        const s = subtasks.find((x) => x.id === e.subtaskId);
        if (!s) throw new Error(`Edit refers to unknown subtask ${e.subtaskId}`);
        (s as Record<string, unknown>)[e.field] = e.value;
        break;
      }
      case "remove":
        if (!subtasks.some((x) => x.id === e.subtaskId)) throw new Error(`Edit refers to unknown subtask ${e.subtaskId}`);
        subtasks = subtasks.filter((x) => x.id !== e.subtaskId);
        break;
      case "add": {
        const at = e.afterSubtaskId === null ? 0 : subtasks.findIndex((x) => x.id === e.afterSubtaskId) + 1;
        if (at === 0 && e.afterSubtaskId !== null) throw new Error(`Edit refers to unknown subtask ${e.afterSubtaskId}`);
        subtasks.splice(at, 0, { ...e.subtask, id: `added-${++added}` });
        break;
      }
      case "confirmNoConsequential":
        confirmedNoConsequential = true;
        break;
      case "removeAssumption":
        if (!assumptions.includes(e.text)) throw new Error(`Edit refers to unknown assumption "${e.text}"`);
        assumptions = assumptions.filter((a) => a !== e.text);
        break;
    }
  }
  const renumbered = subtasks.map((s, i) => ({ ...s, id: `s${i + 1}` }));
  return {
    ...DecompositionSchema.parse({ ...raw, assumptions, subtasks: renumbered }),
    ...(confirmedNoConsequential ? { confirmedNoConsequential: true } : {}),
  };
}
