import { cn } from "@/lib/utils";
import { formatSigned } from "./format";
import { type EpisodePoint, quadrantShortName, quadrantSummary, toPlot } from "./scores.logic";

/**
 * QuadrantChart (2×2): x = A→B, y = B→A, both −1..+1, axes through zero. Only the top-right
 * (virtuous) quadrant is shaded. Earlier episodes are hollow, the latest filled; dashed trail;
 * direct labels, no legend. Text alternative: aria-label summary + a visually hidden table.
 */
export function QuadrantChart({
  points,
  size = 260,
  title,
  className,
}: {
  points: EpisodePoint[];
  size?: number;
  title: string;
  className?: string;
}) {
  const pad = 28;
  const mid = size / 2;
  const inner = size - 2 * pad;
  const plotted = points.map((p) => ({ ...p, ...toPlot(p.a, p.b, size, pad) }));
  const summary = quadrantSummary(points);
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        <rect x={mid} y={pad} width={inner / 2} height={inner / 2} fill="var(--sl-accent-tint)" />
        <text x={size - pad - 4} y={pad + 14} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--sl-accent)">
          Virtuous
        </text>
        <rect x={pad} y={pad} width={inner} height={inner} fill="none" stroke="var(--sl-divider)" />
        <line x1={pad} y1={mid} x2={size - pad} y2={mid} stroke="var(--sl-muted)" />
        <line x1={mid} y1={pad} x2={mid} y2={size - pad} stroke="var(--sl-muted)" />
        <text x={size - pad} y={mid + 16} textAnchor="end" fontSize="11" fill="var(--sl-secondary)">
          A→B +1
        </text>
        <text x={pad} y={mid + 16} fontSize="11" fill="var(--sl-secondary)">
          −1
        </text>
        <text x={mid + 6} y={pad - 8} fontSize="11" fill="var(--sl-secondary)">
          B→A +1
        </text>
        <text x={mid + 6} y={size - pad + 16} fontSize="11" fill="var(--sl-secondary)">
          −1
        </text>
        {plotted.length > 1 && (
          <polyline
            points={plotted.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--sl-ink)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}
        {plotted.map((p, i) => {
          const latest = i === plotted.length - 1;
          return (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill={latest ? "var(--sl-ink)" : "var(--sl-surface)"}
                stroke="var(--sl-ink)"
                strokeWidth="2"
              />
              <text x={p.x + 10} y={p.y - 8} fontSize="12" fontWeight={latest ? 600 : 400} fill="var(--sl-ink)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-[13px] text-muted-foreground">
        {title}. x axis: A→B, automation feeds augmentation. y axis: B→A, augmentation feeds automation. Reinforcement =
        min(A→B, B→A).
      </figcaption>
      {/* Tables ignore the 1 px sr-only clip, so the wrapper carries it. */}
      <div className="sr-only">
      <table>
        <caption>{title}: values per episode</caption>
        <thead>
          <tr>
            <th scope="col">Episode</th>
            <th scope="col">A→B</th>
            <th scope="col">B→A</th>
            <th scope="col">Reinforcement (minimum)</th>
            <th scope="col">Quadrant</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatSigned(p.a)}</td>
              <td>{formatSigned(p.b)}</td>
              <td>{formatSigned(Math.min(p.a, p.b))}</td>
              <td>{quadrantShortName(p.a, p.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
