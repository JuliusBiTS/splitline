/** The four committed presets (SPEC §10), validated against `PresetSchema` at load. */
import { PresetSchema, type Preset } from "@/engine/types";
import claims from "./claims-document-intake.json";
import clinical from "./clinical-referral-triage.json";
import contract from "./contract-clause-review.json";
import hiring from "./hiring-and-sentiment.json";

export const PRESETS: readonly Preset[] = [clinical, contract, hiring, claims].map((p) => PresetSchema.parse(p));

export function getPreset(slug: string): Preset | undefined {
  return PRESETS.find((p) => p.slug === slug);
}
