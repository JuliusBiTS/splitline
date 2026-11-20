/** WhatIfDrawer logic: engine diff chips → display chips with a struck-through "from" value. */
import { TIER_LABEL } from "@/engine/tier";
import type { WhatIfDiff } from "@/engine/types";

export type DiffChip =
  | { kind: "change"; prefix: string; from: string; to: string; text: string }
  | { kind: "note"; text: string };

/** Splits "Verdict: Redesign → Go with conditions" into prefix / from / to. */
export function parseDiffChip(text: string): DiffChip {
  const [left, to] = text.split(" → ");
  if (left === undefined || to === undefined) return { kind: "note", text };
  const colon = left.lastIndexOf(": ");
  if (colon >= 0) return { kind: "change", prefix: left.slice(0, colon), from: left.slice(colon + 2), to, text };
  // "Tier III → II": the struck value is just the level; the prefix carries the full tier label.
  const space = left.lastIndexOf(" ");
  if (space > 0 && /^Tier /.test(left)) {
    const from = left.slice(space + 1);
    return { kind: "change", prefix: TIER_LABEL, from, to, text: `${TIER_LABEL} ${from} → ${to}` };
  }
  return { kind: "change", prefix: "", from: left, to, text };
}

/** Only real changes become chips; "unchanged" notes are dropped so the diff stays scannable. */
export function diffChips(diff: Pick<WhatIfDiff, "chips">): DiffChip[] {
  return diff.chips.filter((c) => !/unchanged$/.test(c)).map(parseDiffChip);
}

export function hasChanges(diff: Pick<WhatIfDiff, "chips">): boolean {
  return diffChips(diff).length > 0;
}
