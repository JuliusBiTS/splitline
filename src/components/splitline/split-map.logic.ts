/** SplitMap and owner-control logic. */
import type { SplitOwner } from "@/engine/types";
import { plural } from "./format";

export const OWNERS: readonly SplitOwner[] = ["machine", "machine_review", "human"];

export const OWNER_LABELS: Record<SplitOwner, string> = {
  machine: "Machine",
  machine_review: "Machine + review",
  human: "Human",
};

/** "5 subtasks · 2 Machine · 2 Machine + review · 1 Human" (live count in the intake bottom bar). */
export function splitSummary(owners: readonly SplitOwner[]): string {
  const counts = OWNERS.map((o) => `${owners.filter((x) => x === o).length} ${OWNER_LABELS[o]}`);
  return [plural(owners.length, "subtask"), ...counts].join(" · ");
}

/** The edited flag is derived: the owner differs from the AI proposal (handoff "Interactions"). */
export function isOwnerEdited(owner: SplitOwner, proposed: SplitOwner): boolean {
  return owner !== proposed;
}

export function ownerEditedNote(proposed: SplitOwner): string {
  return `Owner edited by you · AI proposed ${OWNER_LABELS[proposed]}`;
}

export function isSplitOwner(v: unknown): v is SplitOwner {
  return typeof v === "string" && (OWNERS as readonly string[]).includes(v);
}
