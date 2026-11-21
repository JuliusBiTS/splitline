"use client";

import NumberFlow from "@number-flow/react";
import { ChevronLeftIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/** A What-if control: an on/off switch or a choice from a short list (SPEC §7.6). */
export type WhatIfControl =
  | ({ kind?: "switch" } & WhatIfToggle)
  | { kind: "select"; id: string; label: string; value: string; options: { value: string; label: string }[] };

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

function ControlRow({
  control,
  onToggle,
  onSelect,
}: {
  control: WhatIfControl;
  onToggle: (id: string, checked: boolean) => void;
  onSelect?: (id: string, value: string) => void;
}) {
  const labelId = `whatif-${control.id}-label`;
  if (control.kind === "select") {
    return (
      <>
        <span id={labelId} className="text-[15px] text-ink">
          {control.label}
        </span>
        <Select value={control.value} items={control.options} onValueChange={(v) => typeof v === "string" && onSelect?.(control.id, v)}>
          <SelectTrigger aria-labelledby={labelId} className="min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {control.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }
  return (
    <>
      <label htmlFor={`whatif-${control.id}`} className="text-[15px] text-ink">
        {control.label}
      </label>
      <Switch id={`whatif-${control.id}`} checked={control.checked} onCheckedChange={(c) => onToggle(control.id, c)} />
    </>
  );
}

/**
 * WhatIfDrawer: a non-modal right sheet (Base UI Dialog). Controls recompute through the engine
 * (the caller passes `onToggle`/`onSelect` and the resulting diff); nothing persists until "Apply to
 * design". Without `onApply` (presets) the drawer is exploration only and shows `footerNote`.
 */
export function WhatIfDrawer({
  open,
  onOpenChange,
  toggles,
  onToggle,
  onSelect,
  chips,
  verdict,
  tier,
  rulesCount,
  blockersCount,
  onApply,
  footerNote,
  pending = false,
  side = "right",
  handle = "fixed",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggles: WhatIfControl[];
  onToggle: (id: string, checked: boolean) => void;
  onSelect?: (id: string, value: string) => void;
  chips: DiffChip[];
  verdict: Verdict;
  tier: TierLevel;
  rulesCount: number;
  blockersCount: number;
  onApply?: () => void;
  /** Shown in the footer when there is no Apply button, e.g. "Presets are fixed." */
  footerNote?: string;
  /** True while the engine loads; the diff area says so instead of "No change yet". */
  pending?: boolean;
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
                // Below md the side tab would cover content: it becomes a bottom-right pill instead.
                handle === "fixed" &&
                  "fixed right-4 bottom-4 z-40 h-11 w-auto flex-row rounded-pill border border-border px-4 [writing-mode:horizontal-tb] md:top-1/2 md:right-0 md:bottom-auto md:h-[132px] md:w-10 md:-translate-y-1/2 md:flex-col md:rounded-none md:rounded-l-card md:border-0 md:px-0 md:[writing-mode:vertical-rl]",
              )}
            />
          ) : (
            <Button size="xl" className="w-full" />
          )
        }
      >
        {side === "right" && <ChevronLeftIcon aria-hidden className={cn("size-4 rotate-90", handle === "fixed" && "hidden md:block")} />}
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
              <ControlRow control={t} onToggle={onToggle} onSelect={onSelect} />
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
              <dd data-testid="whatif-rules-count" data-value={rulesCount} className="font-mono text-lg font-medium text-ink">
                <NumberFlow value={rulesCount} respectMotionPreference />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Blockers</dt>
              <dd data-testid="whatif-blockers-count" data-value={blockersCount} className="font-mono text-lg font-medium text-ink">
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
          {pending ? (
            <p className="text-sm text-muted-foreground">Loading the engine…</p>
          ) : (
            chips.length === 0 && <p className="text-sm text-muted-foreground">No change yet. Change a setting above.</p>
          )}
        </section>
        <DialogFooter>
          {footerNote && <p className="mr-auto self-center text-sm text-muted-foreground">{footerNote}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onApply && (
            <Button onClick={onApply} disabled={chips.length === 0}>
              Apply to design
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
