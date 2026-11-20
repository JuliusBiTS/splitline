/** VerdictCard logic: verdict → glyph, tier chip wording. */
import { TIER_LABEL } from "@/engine/tier";
import type { TierLevel, Verdict } from "@/engine/types";
import { VERDICT_LABELS } from "@/engine/verdict";

/**
 * Glyph shapes (handoff): go = filled circle, go with conditions = half-filled circle,
 * redesign = diamond. Stop has no design glyph; it gets a filled square (ADR-0005 gap fill).
 */
export type VerdictGlyphShape = "filled_circle" | "half_circle" | "diamond" | "square";

export const VERDICT_GLYPHS: Record<Verdict, VerdictGlyphShape> = {
  go: "filled_circle",
  go_with_conditions: "half_circle",
  redesign: "diamond",
  stop: "square",
};

export function verdictLabel(v: Verdict): string {
  return VERDICT_LABELS[v];
}

/**
 * Always "AIA-inspired indicative tier <n>" on screen (CLAUDE.md). There is no short form: the
 * handoff's compact "Tier III" chips would hide the qualifier from sighted users (ADR-0005).
 */
export function tierChipLabel(level: TierLevel): string {
  return `${TIER_LABEL} ${level}`;
}
