"use client";

import NumberFlow from "@number-flow/react";
import { ChevronLeftIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { TierLevel, Verdict } from "@/engine/types";
import { cn } from "@/lib/utils";
import { TierChip, VerdictChip } from "./verdict-card";
import type { DiffChip } from "./what-if.logic";

export interface WhatIfToggle {
  id: string;
  label: string;
  checked: boolean;
}

/** One diff chip: struck-through old value → bold new value. */
export function DiffChipView({ chip }: { chip: DiffChip }) {
  if (chip.kind === "note") {
    return <span className="inline-flex min-h-7 items-center rounded-control bg-chip px-2.5 text-[13px] font-medium text-ink">{chip.text}</span>;
  }
  return (
    <span className="inline-flex min-h-7 flex-wrap items-center gap-1.5 rounded-control bg-chip px-2.5 text-[13px] text-ink">
      {chip.prefix && <span className="text-muted-foreground">{chip.prefix}</span>}
      <s className="text-muted-foreground">
        <span className="sr-only">from </span>
        {chip.from}
      </s>
      <span aria-hidden>→</span>
      <strong className="font-semibold">
        <span className="sr-only">to </span>
        {chip.to}
      </strong>
    </span>
  );
}

/**
 * WhatIfDrawer: a non-modal right sheet (Base UI Dialog). Toggles recompute through the engine
 * (the caller passes `onToggle` and the resulting diff); nothing persists until "Apply to design".
 */
export function WhatIfDrawer({
  open,
  onOpenChange,
  toggles,
  onToggle,
  chips,
  verdict,
  tier,
  rulesCount,
  blockersCount,
  onApply,
  side = "right",
  handle = "fixed",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggles: WhatIfToggle[];
  onToggle: (id: string, checked: boolean) => void;
  chips: DiffChip[];
  verdict: Verdict;
  tier: TierLevel;
  rulesCount: number;
  blockersCount: number;
  onApply: () => void;
  side?: "right" | "bottom";
  /** "fixed" pins the handle to the right edge (product); "inline" keeps it in flow (specimens). */
  handle?: "fixed" | "inline";
}) {
  const diffId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={side === "bottom"}>
      <DialogTrigger
        render={
          side === "right" ? (
            <button
              type="button"
              className={cn(
                "flex h-[132px] w-10 cursor-pointer flex-col items-center justify-center gap-2 rounded-l-card bg-surface text-sm font-semibold text-brand shadow-elevated [writing-mode:vertical-rl]",
                handle === "fixed" && "fixed top-1/2 right-0 z-40 -translate-y-1/2",
              )}
            />
          ) : (
            <Button size="xl" className="w-full" />
          )
        }
      >
        {side === "right" && <ChevronLeftIcon aria-hidden className="size-4 rotate-90" />}
        What if…
      </DialogTrigger>
      <DialogContent variant={side === "right" ? "sheet-right" : "sheet-bottom"} showOverlay={side === "bottom"} aria-describedby={diffId}>
        <DialogHeader>
          <DialogTitle>What if…</DialogTitle>
          <DialogDescription>Try a change. Nothing is saved until you apply it to the design.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y divide-divider">
          {toggles.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 py-3">
              <label htmlFor={`whatif-${t.id}`} className="text-[15px] text-ink">
                {t.label}
              </label>
              <Switch id={`whatif-${t.id}`} checked={t.checked} onCheckedChange={(c) => onToggle(t.id, c)} />
            </li>
          ))}
        </ul>
        <section id={diffId} aria-live="polite" className="flex flex-col gap-3 rounded-card bg-subtle p-4">
          <h3 className="text-sm font-semibold text-ink">What changes</h3>
          <div className="flex flex-wrap items-center gap-2">
            <VerdictChip verdict={verdict} />
            <TierChip level={tier} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Rules triggered</dt>
              <dd className="font-mono text-lg font-medium text-ink">
                <NumberFlow value={rulesCount} respectMotionPreference />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Blockers</dt>
              <dd className="font-mono text-lg font-medium text-ink">
                <NumberFlow value={blockersCount} respectMotionPreference />
              </dd>
            </div>
          </dl>
          <ul className={cn("flex flex-wrap gap-2", chips.length === 0 && "hidden")} aria-label="Differences">
            {chips.map((c) => (
              <li key={c.text}>
                <DiffChipView chip={c} />
              </li>
            ))}
          </ul>
          {chips.length === 0 && <p className="text-sm text-muted-foreground">No change yet. Turn on a switch above.</p>}
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onApply} disabled={chips.length === 0}>
            Apply to design
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
