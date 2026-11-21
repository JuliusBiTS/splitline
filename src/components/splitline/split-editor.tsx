"use client";

import { useId, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SplitOwner } from "@/engine/types";
import { isOwnerEdited, isSplitOwner, OWNER_LABELS, OWNERS, ownerEditedNote, splitSummary } from "./split-map.logic";

type Level = "low" | "medium" | "high" | "critical";
const BASE_LEVELS: { value: Level; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export interface SplitEditorRow {
  subtaskId: string;
  name: string;
  judgment: Level;
  errorCost: Level;
  volume: Level;
  /** What the AI proposed; the edited flag is derived from it. */
  proposedOwner: SplitOwner;
  reason: string;
}

/** Owner control: a single-select segmented ToggleGroup (Base UI) of Machine / Machine + review / Human. */
export function OwnerControl({
  value,
  onChange,
  label,
}: {
  value: SplitOwner;
  onChange: (o: SplitOwner) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(v: unknown[]) => {
        const next = v[0];
        if (isSplitOwner(next)) onChange(next);
      }}
    >
      {OWNERS.map((o) => (
        <ToggleGroupItem key={o} value={o} className="w-auto px-3 text-sm">
          {OWNER_LABELS[o]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

const ERROR_COST_LEVELS: { value: Level; label: string }[] = [...BASE_LEVELS, { value: "critical", label: "Critical" }];

function LevelSelect({ value, label, critical = false }: { value: Level; label: string; critical?: boolean }) {
  const levels = critical ? ERROR_COST_LEVELS : BASE_LEVELS;
  const [v, setV] = useState<Level>(value);
  return (
    <Select
      value={v}
      onValueChange={(nv) => {
        const hit = levels.find((l) => l.value === nv);
        if (hit) setV(hit.value);
      }}
      items={levels}
    >
      <SelectTrigger aria-label={label} className="w-[108px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {levels.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * SplitMap (edit view, Intake step 3 "Confirm the split"): every AI proposal is editable, and an
 * edited owner is flagged against the AI proposal. Nothing is analyzed until the user confirms.
 */
export function SplitEditor({ rows }: { rows: SplitEditorRow[] }) {
  const [owners, setOwners] = useState<SplitOwner[]>(rows.map((r) => r.proposedOwner));
  const summaryId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[1000px] border-collapse text-left text-[15px]">
          <caption className="sr-only">Confirm the split: proposed owner per subtask, editable</caption>
          <thead className="bg-subtle text-[13px] font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 px-3 py-3 font-medium">#</th>
              <th scope="col" className="px-3 py-3 font-medium">Subtask</th>
              <th scope="col" className="px-3 py-3 font-medium">Judgment</th>
              <th scope="col" className="px-3 py-3 font-medium">Error cost</th>
              <th scope="col" className="px-3 py-3 font-medium">Volume</th>
              <th scope="col" className="px-3 py-3 font-medium">Proposed owner</th>
              <th scope="col" className="px-3 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const owner = owners[i]!;
              return (
                <tr key={r.subtaskId} className="min-h-16 border-t border-divider align-middle">
                  <td className="px-3 py-3 font-mono text-[13px] text-muted-foreground">{i + 1}</td>
                  <th scope="row" className="px-3 py-3 font-medium text-ink">{r.name}</th>
                  <td className="px-3 py-3"><LevelSelect value={r.judgment} label={`Judgment for ${r.name}`} /></td>
                  <td className="px-3 py-3"><LevelSelect value={r.errorCost} label={`Error cost for ${r.name}`} critical /></td>
                  <td className="px-3 py-3"><LevelSelect value={r.volume} label={`Volume for ${r.name}`} /></td>
                  <td className="px-3 py-3">
                    <OwnerControl
                      value={owner}
                      label={`Owner for ${r.name}`}
                      onChange={(o) => setOwners((prev) => prev.map((p, j) => (j === i ? o : p)))}
                    />
                    {isOwnerEdited(owner, r.proposedOwner) && (
                      <p className="mt-1.5 text-xs font-medium text-brand">{ownerEditedNote(r.proposedOwner)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-pill bg-chip px-2.5 py-1 text-[13px] text-ink-2">{r.reason}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p id={summaryId} aria-live="polite" className="text-sm font-medium text-ink-2">
        {splitSummary(owners)}
      </p>
    </div>
  );
}
