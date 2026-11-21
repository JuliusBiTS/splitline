/** Splitline's own committed intake (`/self-assessment`), validated like a preset. */
import { PresetSchema, type Preset } from "@/engine/types";
import raw from "./self-assessment.json";

export const SELF_ASSESSMENT: Preset = PresetSchema.parse(raw);
