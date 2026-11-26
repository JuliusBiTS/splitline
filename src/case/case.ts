/**
 * Live case record (SPEC §4, ADR-0008, ADR-0020). Cases live only in the creator's browser
 * (`localStorage`); no server storage. The full intake (with the free-text description) stays
 * local; share links carry the structured part only (`./share.ts`).
 */
import { z } from "zod";
import {
  ConfirmedDecompositionSchema,
  DecompositionSchema,
  IntakeInputSchema,
  NarrativeSchema,
  NarrativeSourceSchema,
} from "@/engine/types";
import { IntakeStructuredSchema } from "@/engine/structured-intake";

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Case IDs are short, URL-safe and random: they name a browser-local record, nothing more. */
export const CaseIdSchema = z.string().regex(/^[a-z0-9]{8,16}$/);

export const CaseRecordSchema = z.object({
  v: z.literal(1),
  id: CaseIdSchema,
  /** The "today" the engine runs with, fixed at creation so review dates reproduce (ADR-0020). */
  asOf: IsoDate,
  /** Full intake when the case was created here; structured intake only when it came from a share link. */
  intake: z.union([IntakeInputSchema, IntakeStructuredSchema]),
  /** True when the case was opened from a share link (no description, no narrative). */
  fromShareLink: z.boolean(),
  /** The AI proposal before the user's edits; null for manual entry or shared cases. */
  proposed: DecompositionSchema.nullable(),
  decomposition: ConfirmedDecompositionSchema,
  narrative: NarrativeSchema.optional(),
  narrativeSource: NarrativeSourceSchema.optional(),
  /** How the subtasks were produced. */
  entry: z.enum(["live", "manual", "shared"]),
});
export type CaseRecord = z.infer<typeof CaseRecordSchema>;
export type CaseRecordInput = z.input<typeof CaseRecordSchema>;

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** 10 random characters from an unambiguous alphabet. `random` is injectable for tests. */
export function newCaseId(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(random(10), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

/** The structured intake (no description), whatever kind of record this is. */
export function structuredIntakeOf(record: Pick<CaseRecord, "intake">): z.input<typeof IntakeStructuredSchema> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { processDescription, ...rest } = record.intake as z.input<typeof IntakeInputSchema>;
  return rest;
}

/** The free-text description, when this browser has it. */
export function descriptionOf(record: Pick<CaseRecord, "intake">): string | null {
  return "processDescription" in record.intake && typeof record.intake.processDescription === "string"
    ? record.intake.processDescription
    : null;
}
