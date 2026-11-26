/** SplitMap and owner-control logic. */
import type { SplitOwner } from "@/engine/types";
import { plural } from "./format";

export const OWNERS: readonly SplitOwner[] = ["machine", "machine_review", "human"];

/** Plain owner labels (ADR-0018), 1:1 with the thesis labels Machine / Machine + human review / Human. */
export const OWNER_LABELS: Record<SplitOwner, string> = {
  machine: "AI does it (spot-checked)",
  machine_review: "AI drafts, a person checks and signs off",
  human: "A person does it (AI may assist)",
};

/** Short forms for column headers, toggles and counts. */
export const OWNER_LABELS_SHORT: Record<SplitOwner, string> = {
  machine: "AI does it",
  machine_review: "AI drafts, person signs off",
  human: "Person does it",
};

/** Thesis labels (`02_*` §2), shown in Research basis only. */
export const OWNER_LABELS_RESEARCH: Record<SplitOwner, string> = {
  machine: "Machine",
  machine_review: "Machine + human review",
  human: "Human",
};

/** "5 subtasks · 2 AI does it · 2 AI drafts, person signs off · 1 Person does it" (live count in the intake bottom bar). */
export function splitSummary(owners: readonly SplitOwner[]): string {
  const counts = OWNERS.map((o) => `${owners.filter((x) => x === o).length} ${OWNER_LABELS_SHORT[o]}`);
  return [plural(owners.length, "subtask"), ...counts].join(" · ");
}

/** The edited flag is derived: the owner differs from the AI proposal (handoff "Interactions"). */
export function isOwnerEdited(owner: SplitOwner, proposed: SplitOwner): boolean {
  return owner !== proposed;
}

export function ownerEditedNote(proposed: SplitOwner): string {
  return `Owner edited by you · AI proposed: ${OWNER_LABELS_SHORT[proposed]}`;
}

export function isSplitOwner(v: unknown): v is SplitOwner {
  return typeof v === "string" && (OWNERS as readonly string[]).includes(v);
}
