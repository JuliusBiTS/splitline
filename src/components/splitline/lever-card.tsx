import type { LeverCard as LeverCardData } from "@/engine/types";
import { LEVER_DRIVERS, LEVER_NAMES } from "@/engine/levers";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./status-badge";

/**
 * LeverCard (×3): setting → guardrail → direct cost → monitoring signal → warning sign (UX §3).
 * The direct cost is always shown (02_* §1.7); signals are illustrative (thesis Table 4).
 */
export function LeverCard({
  lever,
  index,
  className,
}: {
  lever: LeverCardData;
  /** 1-based position, for the "LEVER n" eyebrow. */
  index: number;
  className?: string;
}) {
  const name = LEVER_NAMES[lever.lever];
  return (
    <article className={cn("flex flex-col gap-4 rounded-card border border-border bg-surface p-6", className)}>
      <p className="font-mono text-xs font-medium tracking-[0.04em] text-brand uppercase">
        Lever {index} · {name.replace(/\s*\(P\d\)$/, "")}
      </p>
      <h3 className="text-xl font-semibold text-ink">{name}</h3>
      <p className="-mt-2 text-sm text-muted-foreground">Drives: {LEVER_DRIVERS[lever.lever].toLowerCase()}</p>
      <p className="text-base leading-normal text-ink">{lever.setting}</p>
      {lever.details.length > 0 && (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-2">
          {lever.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      <hr className="border-divider" />
      <div>
        <h4 className="text-sm font-semibold text-ink">Guardrail</h4>
        <p className="mt-1 text-[15px] text-ink-2">{lever.guardrail}</p>
        {lever.lever === "coordination" && (
          <p className="mt-1 text-sm text-muted-foreground">Standardize the interface, not the task allocation.</p>
        )}
      </div>
      <div className="rounded-control bg-subtle p-4">
        <h4 className="text-sm font-semibold text-ink">Direct cost</h4>
        <p className="mt-1 text-[15px] text-ink-2">{lever.directCost}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span aria-hidden className="size-2 rounded-pill bg-brand" />
            Monitor
          </dt>
          <dd className="mt-1 text-sm text-ink-2">{lever.monitoringIndicator}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
            <StatusIcon kind="blocker" className="text-st-blocker" />
            Warn if
          </dt>
          <dd className="mt-1 text-sm text-ink-2">{lever.warningIndicator}</dd>
        </div>
      </dl>
    </article>
  );
}
