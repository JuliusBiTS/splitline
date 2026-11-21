"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { formatCents } from "./format";
import { checkTotal, KEYBOARD_LEGEND, REASON_CODES, type ReasonCode, reviewKeyAction } from "./review-panel.logic";
import { StatusIcon } from "./status-badge";

export interface ReceiptLine {
  label: string;
  cents: number;
}

export interface ReviewField {
  id: string;
  label: string;
  value: string;
  /** Confidence in words: High / Medium / Low. */
  confidence: string;
}

export type ReviewDecision = "accept" | "correct" | "escalate";

const DECISION_LABELS: Record<ReviewDecision, string> = {
  accept: "Accept AI",
  correct: "Correct",
  escalate: "Escalate",
};

/**
 * ReviewPanel (Living Lab): synthetic document left, extracted fields right. The flagged field
 * shows its reason, the highlighted source snippet and the arithmetic. Shortcuts: A / C / E,
 * 1–5 reason code, J / K next / previous. Shortcuts are scoped to the panel (focus inside it) and
 * ignored while typing.
 */
export function ReviewPanel({
  merchant,
  lines,
  totalCents,
  fields,
  onNavigate,
}: {
  merchant: string;
  lines: ReceiptLine[];
  totalCents: number;
  fields: ReviewField[];
  onNavigate?: (dir: "next" | "previous") => void;
}) {
  const check = checkTotal(
    lines.map((l) => l.cents),
    totalCents,
  );
  const [reason, setReason] = useState<ReasonCode | null>(check.mismatch ? 1 : null);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [nav, setNav] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const totalId = `${uid}-total`;
  const noteId = `${uid}-total-note`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      const action = reviewKeyAction({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        targetTag: t?.tagName,
        targetIsContentEditable: t?.isContentEditable,
      });
      if (!action) return;
      e.preventDefault();
      if (action.type === "reason") setReason(action.code);
      else if (action.type === "next" || action.type === "previous") {
        setNav(action.type === "next" ? "Next item" : "Previous item");
        onNavigate?.(action.type);
      } else setDecision(action.type);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [onNavigate]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-label="Review panel. Shortcuts work while focus is inside this panel."
      className="grid gap-6 rounded-card border border-border bg-surface p-4 outline-offset-4 sm:p-6 lg:grid-cols-[1fr_300px]"
    >
      {/* Synthetic receipt */}
      <div className="rounded-card bg-subtle p-4 sm:p-6">
        <div className="mx-auto max-w-[320px] rounded-control bg-surface p-5 shadow-doc">
          <p className="text-center text-sm font-semibold text-ink">{merchant}</p>
          <p className="text-center text-xs text-muted-foreground">Synthetic receipt</p>
          <ul className="mt-4 flex flex-col gap-1.5 font-mono text-[13px] text-ink">
            {lines.map((l, i) => (
              <li key={`${l.label}-${i}`} className="flex justify-between gap-4">
                <span>{l.label}</span>
                <span>{(l.cents / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p
            className={cn(
              "mt-3 flex justify-between border-t border-divider pt-2 font-mono text-[13px] font-semibold text-ink",
              check.mismatch && "rounded-control bg-st-blocker-bg px-1 outline-2 outline-st-blocker",
            )}
          >
            <span>TOTAL</span>
            <span>{formatCents(totalCents)}</span>
          </p>
        </div>
      </div>

      {/* Fields and actions */}
      <div className="flex flex-col gap-4">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-1">
            <label htmlFor={`${uid}-${f.id}`} className="flex items-center justify-between text-sm font-medium text-ink">
              {f.label}
              <span className="text-xs font-normal text-muted-foreground">Confidence: {f.confidence}</span>
            </label>
            <input
              id={`${uid}-${f.id}`}
              defaultValue={f.value}
              className="h-9 rounded-control border border-border-strong bg-surface px-3 font-mono text-sm text-ink"
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label htmlFor={totalId} className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            Total
            {check.mismatch && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-st-blocker">
                <StatusIcon kind="blocker" />
                Total ≠ sum of lines
              </span>
            )}
          </label>
          <input
            id={totalId}
            defaultValue={formatCents(totalCents)}
            aria-invalid={check.mismatch}
            aria-describedby={noteId}
            className={cn(
              "h-9 rounded-control border bg-surface px-3 font-mono text-sm text-ink",
              check.mismatch ? "border-2 border-st-blocker bg-flag-field-bg" : "border-border-strong",
            )}
          />
          <p id={noteId} className="text-[13px] text-ink-2">
            Source: <mark className="rounded-sm bg-st-blocker-bg px-1 font-mono text-ink">TOTAL {formatCents(totalCents)}</mark>.{" "}
            {check.message}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">Reason code</legend>
          <ToggleGroup
            variant="chip"
            size="sm"
            aria-label="Reason code"
            value={reason === null ? [] : [String(reason)]}
            onValueChange={(v: unknown[]) => {
              const n = Number(v[0]);
              setReason(Number.isInteger(n) && n >= 1 && n <= 5 ? (n as ReasonCode) : null);
            }}
          >
            {REASON_CODES.map((r) => (
              <ToggleGroupItem key={r.code} value={String(r.code)}>
                <span className="font-mono">{r.code}</span> {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          {(["accept", "correct", "escalate"] as const).map((d) => (
            <Button
              key={d}
              variant={d === "correct" ? "default" : "outline"}
              aria-pressed={decision === d}
              onClick={() => setDecision(d)}
              className={cn(decision === d && d !== "correct" && "border-ink")}
            >
              {DECISION_LABELS[d]}
            </Button>
          ))}
        </div>
        <p aria-live="polite" className="min-h-5 text-sm text-ink-2">
          {decision ? `Decision: ${DECISION_LABELS[decision]}` : ""}
          {decision && reason ? ` · reason ${reason}` : ""}
          {nav ? ` ${nav}` : ""}
        </p>

        <div>
          <h4 className="text-[13px] font-medium text-muted-foreground">Keyboard</h4>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-2">
            {KEYBOARD_LEGEND.map((k) => (
              <li key={k.label} className="flex items-center gap-1.5">
                {k.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-control border border-b-2 border-border-strong bg-surface px-1.5 font-mono text-xs text-ink"
                  >
                    {key}
                  </kbd>
                ))}
                {k.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
