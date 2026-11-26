/** Pure helpers for the Pulse survey form (SPEC §7.7). Scoring itself is `scorePulse` in the engine. */
import { PulseInputSchema, type PulseInput, type PulseRole } from "@/engine/types";

export const PULSE_ITEM_IDS = ["A1", "A2", "A3", "B1", "B2", "B3", "D1", "D2", "D3"] as const;
export type PulseItemId = (typeof PULSE_ITEM_IDS)[number];

export type PulseAnswers = Partial<Record<PulseItemId, number>> & { role?: PulseRole };

export const PULSE_GROUPS: { id: string; title: string; hint: string; items: readonly PulseItemId[] }[] = [
  {
    id: "a",
    title: "Does the AI make your people's work better?",
    hint: "Automation feeding augmentation (A→B). Table 5 intends these items for the people doing the augmented work.",
    items: ["A1", "A2", "A3"],
  },
  {
    id: "b",
    title: "Do your people make the AI better?",
    hint: "Augmentation feeding automation (B→A). Table 5 intends these items for the team that runs the AI system.",
    items: ["B1", "B2", "B3"],
  },
  {
    id: "d",
    title: "What drives the coupling?",
    hint: "Driver items. Table 5 intends these for both sides.",
    items: ["D1", "D2", "D3"],
  },
];

export function missingItems(answers: PulseAnswers): PulseItemId[] {
  return PULSE_ITEM_IDS.filter((id) => answers[id] === undefined);
}

/** A complete, valid engine input, or null while anything is unanswered. */
export function toPulseInput(answers: PulseAnswers): PulseInput | null {
  const parsed = PulseInputSchema.safeParse(answers);
  return parsed.success ? parsed.data : null;
}

/** Stored answers from `localStorage`: keeps only valid fields. */
export function restoreAnswers(stored: unknown): PulseAnswers {
  if (!stored || typeof stored !== "object") return {};
  const s = stored as Record<string, unknown>;
  const out: PulseAnswers = {};
  for (const id of PULSE_ITEM_IDS) {
    const v = s[id];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7) out[id] = v;
  }
  if (s.role === "augmentation_work" || s.role === "ai_team" || s.role === "lead") out.role = s.role;
  return out;
}
