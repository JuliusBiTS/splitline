/**
 * Recorded preset narratives (ADR-0019 §9): the guarded LLM narration stored with each preset
 * recording. Shown on the Summary and in the charter with an AI-provenance label (ADR-0020).
 */
import type { Narrative, NarrativeSource } from "@/engine/types";
import claims from "./recorded/claims-document-intake.json";
import clinical from "./recorded/clinical-referral-triage.json";
import contract from "./recorded/contract-clause-review.json";
import hiring from "./recorded/hiring-and-sentiment.json";
import { PresetRecordingSchema } from "./recorded";

export interface NarrativeView {
  narrative: Narrative;
  source: NarrativeSource;
  /** One line saying who wrote it and what decided the results. */
  provenance: string;
}

export const ENGINE_DECIDES_NOTE = "The rules engine, not the AI, set the tier, the rules and the split.";

export function narrativeProvenance(source: NarrativeSource, model?: string, date?: string): string {
  if (source === "template") return `Summary assembled from the results without AI writing. ${ENGINE_DECIDES_NOTE}`;
  const by = model ? `Drafted by AI (${model})` : "Drafted by AI";
  return `${by} from the engine results${date ? ` on ${date}` : ""}, checked by Splitline's guard. ${ENGINE_DECIDES_NOTE}`;
}

const RECORDINGS = [clinical, contract, hiring, claims].map((r) => PresetRecordingSchema.parse(r));

export function getRecordedNarrative(slug: string, formatDate: (iso: string) => string = (d) => d): NarrativeView | null {
  const r = RECORDINGS.find((x) => x.slug === slug);
  if (!r?.narrate) return null;
  return {
    narrative: r.narrate.narrative,
    source: r.narrate.source,
    provenance: narrativeProvenance(r.narrate.source, r.model, formatDate(r.narrate.recordedAt)),
  };
}
