import type { CostEstimate, LeverCard as LeverCardData } from "@/engine/types";
import { DIRECT_COST_PLAIN, LEVER_DRIVERS, LEVER_NAMES, LEVER_PLAIN_NAMES, LEVER_PROPOSITIONS, TABLE_4 } from "@/engine/levers";
import { cn } from "@/lib/utils";
import { ResearchBasis } from "./research-basis";
import { StatusIcon } from "./status-badge";

/**
 * LeverCard (×3): setting → what to keep in place (guardrail) → what it costs you → monitoring
 * signal → warning sign (UX §3, ADR-0018). The guardrail and the cost are always visible (`02_*`
 * §1.7); the thesis name, proposition and Table 4 direct cost sit in "Research basis".
 */
export function LeverCard({
  lever,
  index,
  costs,
  className,
}: {
  lever: LeverCardData;
  /** 1-based position, for the "Setting n" eyebrow. */
  index: number;
  /** Case-specific cost lines for this lever (engine `costEstimates`). */
  costs?: CostEstimate;
  className?: string;
}) {
  const t4 = TABLE_4[lever.lever];
  return (
    <article className={cn("flex flex-col gap-4 rounded-card border border-border bg-surface p-6", className)}>
      <p className="font-mono text-xs font-medium tracking-[0.04em] text-brand uppercase">Setting {index}</p>
      <h3 className="-mt-2 text-xl font-semibold text-ink">{LEVER_PLAIN_NAMES[lever.lever]}</h3>
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
        <h4 className="text-sm font-semibold text-ink">Keep in place</h4>
        <p className="mt-1 text-[15px] text-ink-2">{lever.guardrail}</p>
        {lever.lever === "coordination" && (
          <p className="mt-1 text-sm text-muted-foreground">Standardize the interface, not the task allocation.</p>
        )}
      </div>
      <div className="rounded-control bg-subtle p-4">
        <h4 className="text-sm font-semibold text-ink">What it costs you</h4>
        <p className="mt-1 text-[15px] text-ink-2">
          <span className="font-medium text-ink">Direct cost:</span> {DIRECT_COST_PLAIN[lever.lever]}
        </p>
        {costs && costs.lines.length > 0 && (
          <>
            <p className="mt-2 text-[13px] text-muted-foreground">For this case (Splitline estimate):</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
              {costs.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
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
      <ResearchBasis>
        <p>
          <span className="font-semibold text-ink">{LEVER_NAMES[lever.lever]}.</span> Proposition: {LEVER_PROPOSITIONS[lever.lever]}.
          Primary driver: {LEVER_DRIVERS[lever.lever].toLowerCase()}.
        </p>
        <p>Guardrail (keeps the counter-pole): {t4.guardrail}. Beyond the guardrail: {t4.beyondGuardrail.toLowerCase()}.</p>
        <p>Direct cost (thesis Table 4): {lever.directCost}.</p>
        <p className="text-muted-foreground">
          Signals and warning signs are illustrative (thesis Table 4), not validated. The case lines above are Splitline&apos;s
          own rough estimates of this direct cost, not findings from the thesis.
        </p>
      </ResearchBasis>
    </article>
  );
}
