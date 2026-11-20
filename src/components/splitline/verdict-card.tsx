import { type ReactNode, useId } from "react";
import type { TierLevel, Verdict } from "@/engine/types";
import { cn } from "@/lib/utils";
import { tierChipLabel, VERDICT_GLYPHS, verdictLabel } from "./verdict.logic";

/** Verdict glyph (icon, not colour): filled circle, half circle, diamond, square. */
export function VerdictGlyph({ verdict, size = 10, className }: { verdict: Verdict; size?: number; className?: string }) {
  const shape = VERDICT_GLYPHS[verdict];
  const sw = size >= 16 ? 3 : 2;
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable={false} className={cn("shrink-0 text-ink", className)}>
      {shape === "filled_circle" && <circle cx={r} cy={r} r={r} fill="currentColor" />}
      {shape === "half_circle" && (
        <>
          <path d={`M${r} ${sw / 2} A${r - sw / 2} ${r - sw / 2} 0 0 0 ${r} ${size - sw / 2} Z`} fill="currentColor" />
          <circle cx={r} cy={r} r={r - sw / 2} fill="none" stroke="currentColor" strokeWidth={sw} />
        </>
      )}
      {shape === "diamond" && (
        <rect
          x={size * 0.2}
          y={size * 0.2}
          width={size * 0.6}
          height={size * 0.6}
          transform={`rotate(45 ${r} ${r})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
        />
      )}
      {shape === "square" && <rect x={size * 0.1} y={size * 0.1} width={size * 0.8} height={size * 0.8} fill="currentColor" />}
    </svg>
  );
}

/** Verdict chip: `chip` background, glyph + label (preset cards, title rows). */
export function VerdictChip({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-2 rounded-control bg-chip px-2 text-[13px] font-medium text-ink", className)}>
      <VerdictGlyph verdict={verdict} />
      {verdictLabel(verdict)}
    </span>
  );
}

/** Tier chip: always reads "AIA-inspired indicative tier …", on screen and for screen readers. */
export function TierChip({ level, className }: { level: TierLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-control border border-border-strong px-2 text-[13px] font-medium whitespace-nowrap text-ink",
        className,
      )}
    >
      {tierChipLabel(level)}
    </span>
  );
}

export interface VerdictCardProps {
  verdict: Verdict;
  tier: TierLevel;
  /** Why the verdict is what it is (preset `verdictExplanation`). */
  reason: string;
  /** Confidence in words, never a percentage, e.g. "moderate". */
  confidence: string;
  confidenceNote?: string;
  /** e.g. "2 rules in force · 1 proposed" from `ruleCountSummary`. */
  ruleSummary: string;
  /** Top 3 conditions (titles of `VerdictResult.topConditions`), shown with their status badge. */
  topConditions: { id: string; title: string; badge: ReactNode }[];
  /** "What this design costs": the direct cost of each lever (02_* §1.7: never hidden). */
  costs: { label: string; text: string }[];
  /** Primary action, e.g. an "Export charter" button. */
  primaryAction?: ReactNode;
  /** The long disclaimer (`DISCLAIMER_LONG` from the engine), passed in so this stays client-safe. */
  disclaimer: string;
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * VerdictCard (UX §3, handoff §3): verdict, indicative tier, reason, confidence in words, top 3
 * conditions, what the design costs, primary action and the long disclaimer.
 */
export function VerdictCard({
  verdict,
  tier,
  reason,
  confidence,
  confidenceNote,
  ruleSummary,
  topConditions,
  costs,
  primaryAction,
  disclaimer,
  headingLevel = 2,
  className,
}: VerdictCardProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const Sub = headingLevel === 2 ? "h3" : "h4";
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} className={cn("rounded-card border border-border bg-surface p-5 sm:p-8", className)}>
      <p id={labelId} className="text-sm font-medium text-muted-foreground">
        Verdict
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <H className="flex items-center gap-3 text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[40px]">
          <VerdictGlyph verdict={verdict} size={18} />
          {verdictLabel(verdict)}
        </H>
        <TierChip level={tier} />
      </div>
      <p className="mt-4 max-w-prose text-[17px] leading-[1.55] text-ink-2">{reason}</p>
      <hr className="my-5 border-divider" />
      <p className="text-[15px] text-ink-2">
        How sure: <strong className="font-semibold text-ink">{confidence}</strong>
        {confidenceNote ? `. ${confidenceNote}` : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{ruleSummary}</p>
      {topConditions.length > 0 && (
        <>
          <Sub className="mt-6 text-base font-semibold text-ink">Top conditions</Sub>
          <ol className="mt-2 flex flex-col gap-2">
            {topConditions.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink">
                {c.badge}
                <span>{c.title}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {costs.length > 0 && (
        <div className="mt-6 rounded-card bg-subtle p-4 sm:p-6">
          <Sub className="text-base font-semibold text-ink">What this design costs</Sub>
          <dl className="mt-2 flex flex-col divide-y divide-divider">
            {costs.map((c) => (
              <div key={c.label} className="py-2">
                <dt className="text-sm font-semibold text-ink">{c.label}</dt>
                <dd className="mt-0.5 text-sm text-ink-2">{c.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {primaryAction && <div className="mt-6">{primaryAction}</div>}
      <p className="mt-6 text-[13px] text-muted-foreground">{disclaimer}</p>
    </section>
  );
}
