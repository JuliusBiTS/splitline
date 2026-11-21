import { cn } from "@/lib/utils";
import { barGeometry, SCORE_ROW_DESCRIPTIONS, type ScoreRow, scoreRowsSummary } from "./scores.logic";

/**
 * DivergingScoreBar: signed −1..+1 bars from a centre zero line (UX §3, handoff §5).
 * Positive grows right in `score-pos`, negative grows left in `score-neg`; the value is always
 * printed with its sign, so colour is never the only cue. The minimum direction is outlined.
 */
export function DivergingScoreBars({
  rows,
  caption,
  className,
}: {
  rows: ScoreRow[];
  /** e.g. "Reinforcement Pulse · illustrative, not validated" */
  caption: string;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <figcaption className="text-[13px] text-muted-foreground">{caption}</figcaption>
      <ul className="flex flex-col gap-2" aria-label={scoreRowsSummary(rows)}>
        {rows.map((r) => (
          <li
            key={r.key}
            className={cn(
              "grid grid-cols-[112px_1fr_52px] items-center gap-3 rounded-control px-2 py-1.5 sm:grid-cols-[150px_1fr_52px]",
              r.isMinimum && "outline-2 outline-ink",
            )}
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">{r.label}</span>
              <span className="text-xs text-muted-foreground">
                {r.isMinimum ? <strong className="font-semibold text-ink">Minimum · </strong> : null}
                {SCORE_ROW_DESCRIPTIONS[r.key]}
              </span>
            </span>
            <Bar value={r.value} />
            <span className="text-right font-mono text-sm font-medium text-ink">{r.display}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Bar({ value }: { value: number }) {
  const g = barGeometry(value);
  return (
    <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="h-[22px] w-full" aria-hidden focusable={false}>
      <rect x="0" y="4" width="100" height="14" fill="var(--sl-score-track)" />
      {g.side === "pos" && <rect x="50" y="4" width={g.widthPct} height="14" fill="var(--sl-score-pos)" />}
      {g.side === "neg" && <rect x={50 - g.widthPct} y="4" width={g.widthPct} height="14" fill="var(--sl-score-neg)" />}
      <line x1="50" y1="0" x2="50" y2="22" stroke="var(--sl-score-zero)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
