import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_STATE_TEXT, stepState } from "./steps.logic";

/** Stepper (Intake): done = tint circle with accent ✓; current = accent circle, white numeral. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <nav aria-label="Intake steps" className={cn("w-full max-w-[760px]", className)}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((label, i) => {
          const state = stepState(i, current);
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-pill text-[13px] font-semibold",
                  state === "current" && "bg-brand text-on-brand",
                  state === "done" && "bg-brand-tint text-brand",
                  state === "pending" && "border border-border-strong text-muted-foreground",
                )}
              >
                {state === "done" ? <CheckIcon aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-sm whitespace-nowrap", state === "current" ? "font-semibold text-ink" : "text-muted-foreground")}>
                {label}
                <span className="sr-only"> ({STEP_STATE_TEXT[state]})</span>
              </span>
              {i < steps.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-border-strong sm:block" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * ProgressNarration: named steps instead of a spinner (UX §3). `aria-live="polite"` announces
 * progress. Done = accent ✓; current = 10 px accent ring + 600; pending = 1 px ring, muted text.
 */
export function ProgressNarration({
  heading,
  steps,
  current,
  className,
}: {
  heading: string;
  steps: string[];
  /** Index of the running step; `steps.length` = all done. */
  current: number;
  className?: string;
}) {
  return (
    <section aria-live="polite" className={cn("rounded-card border border-border bg-surface p-6", className)}>
      <h3 className="text-base font-semibold text-ink">{heading}</h3>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((label, i) => {
          const state = stepState(i, current);
          return (
            <li key={label} className="flex items-center gap-3 text-[15px]">
              <span aria-hidden className="flex size-4 items-center justify-center">
                {state === "done" && <CheckIcon className="size-4 text-brand" strokeWidth={3} />}
                {state === "current" && <span className="size-2.5 rounded-pill border-2 border-brand" />}
                {state === "pending" && <span className="size-2.5 rounded-pill border border-placeholder" />}
              </span>
              <span className={cn(state === "current" ? "font-semibold text-ink" : state === "done" ? "text-ink" : "text-muted-foreground")}>
                {label}
              </span>
              <span className="sr-only">({STEP_STATE_TEXT[state]})</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
