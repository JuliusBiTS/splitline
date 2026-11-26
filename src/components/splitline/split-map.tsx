import type { SplitOwner } from "@/engine/types";
import { cn } from "@/lib/utils";
import { OWNER_LABELS, OWNER_LABELS_SHORT, OWNERS } from "./split-map.logic";

export interface SplitMapRow {
  subtaskId: string;
  name: string;
  owner: SplitOwner;
  reason: string;
}

/**
 * SplitMap (read view): subtasks × {AI does it, AI drafts + person signs off, person does it}. The owning cell gets an
 * accent dot + reason chip; the owner is also written out for screen readers (never position alone).
 */
export function SplitMap({
  rows,
  startingSplitLabel,
  reviewNote,
  className,
}: {
  rows: SplitMapRow[];
  /** e.g. STARTING_SPLIT_LABEL from the engine: "Starting split: the split will move". */
  startingSplitLabel: string;
  /** e.g. "Recorded in the shared split register · next review December 15, 2026" */
  reviewNote: string;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div className="relative overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
          <caption className="sr-only">
            {startingSplitLabel}. Who does each step: {OWNERS.map((o) => OWNER_LABELS[o]).join("; ")}.
          </caption>
          <thead className="bg-subtle text-[13px] font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="w-[30%] px-4 py-3 font-medium">
                Subtask
              </th>
              {OWNERS.map((o) => (
                <th key={o} scope="col" className="border-l border-divider px-4 py-3 font-medium">
                  {OWNER_LABELS_SHORT[o]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.subtaskId} className="border-t border-divider">
                <th scope="row" className="px-4 py-3 align-top font-medium text-ink">
                  {r.name}
                </th>
                {OWNERS.map((o) => (
                  <td key={o} className="border-l border-divider px-4 py-3 align-top">
                    {r.owner === o ? (
                      <span className="flex flex-col items-start gap-2">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span aria-hidden className="size-3 rounded-pill bg-brand" />
                          <span className="sr-only">Owner: {OWNER_LABELS[o]}</span>
                        </span>
                        <span className="rounded-pill bg-chip px-2.5 py-0.5 text-[13px] text-ink-2">{r.reason}</span>
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-sm text-muted-foreground">
        <span className="font-medium text-ink">{startingSplitLabel}.</span> {reviewNote}
      </figcaption>
    </figure>
  );
}
