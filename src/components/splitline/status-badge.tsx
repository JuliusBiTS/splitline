import { cn } from "@/lib/utils";
import type { StatusBadgeModel, StatusKind } from "./status-badge.logic";

/** Colour pair per kind. Every kind also has its own icon shape, so colour is never the only cue. */
const KIND_CLASSES: Record<StatusKind, string> = {
  applies: "bg-st-applies-bg text-st-applies",
  applies_future: "bg-st-applies-bg text-st-applies",
  mandatory: "bg-st-applies-bg text-st-applies",
  regulator: "bg-st-regulator-bg text-st-regulator",
  regulator_draft: "bg-st-regulator-bg text-st-regulator",
  prepare: "bg-st-prepare-bg text-st-prepare",
  good: "bg-st-good-bg text-st-good",
  reference: "bg-chip text-ink-2",
  blocker: "bg-st-blocker-bg text-st-blocker",
};

/** Icon shapes from the handoff; gap-fill shapes for the extra SPEC labels (ADR-0005). */
export function StatusIcon({ kind, className }: { kind: StatusKind; className?: string }) {
  const common = { "aria-hidden": true, className: cn("shrink-0", className), focusable: false } as const;
  switch (kind) {
    case "applies":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" {...common}>
          <circle cx="5" cy="5" r="5" fill="currentColor" />
        </svg>
      );
    case "mandatory":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" {...common}>
          <circle cx="5" cy="5" r="5" fill="currentColor" />
          <circle cx="5" cy="5" r="1.75" fill="var(--sl-surface)" />
        </svg>
      );
    case "applies_future":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" {...common}>
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "prepare":
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" {...common}>
          <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2.4 1.8" />
        </svg>
      );
    case "regulator":
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" {...common}>
          <rect x="2" y="2" width="8" height="8" transform="rotate(45 6 6)" fill="currentColor" />
        </svg>
      );
    case "regulator_draft":
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" {...common}>
          <rect x="2.5" y="2.5" width="7" height="7" transform="rotate(45 6 6)" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5" />
        </svg>
      );
    case "good":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" {...common}>
          <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "reference":
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" {...common}>
          <circle cx="5" cy="5" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "blocker":
      return (
        <svg width="12" height="11" viewBox="0 0 12 11" {...common}>
          <path d="M6 0.5 11.5 10.5H0.5Z" fill="currentColor" />
        </svg>
      );
  }
}

/**
 * StatusBadge: icon + label, always (UX §3, handoff). 28 px tall, or 24 px inline.
 * Pass the model from `statusBadgeFor` so labels stay in one place. A Blocker badge carries the
 * underlying status: visible after the label unless `statusShownNearby` says the caller prints it.
 */
export function StatusBadge({
  model,
  size = "default",
  statusShownNearby = false,
  className,
}: {
  model: Pick<StatusBadgeModel, "kind" | "label"> & { statusLabel?: string };
  size?: "default" | "inline";
  statusShownNearby?: boolean;
  className?: string;
}) {
  const showStatus = model.kind === "blocker" && model.statusLabel && model.statusLabel !== model.label;
  return (
    <span
      data-kind={model.kind}
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-control px-2.5 text-[13px] leading-tight font-medium",
        size === "inline" ? "min-h-6" : "min-h-7 py-1",
        KIND_CLASSES[model.kind],
        className,
      )}
    >
      <StatusIcon kind={model.kind} />
      {model.label}
      {showStatus &&
        (statusShownNearby ? (
          <span className="sr-only"> ({model.statusLabel})</span>
        ) : (
          <span className="font-normal"> · {model.statusLabel}</span>
        ))}
    </span>
  );
}
