/**
 * Printable one-page charter (SPEC §11). Server-renderable; the print stylesheet (globals.css,
 * `@page`) and the `print:` variants compress it to one A4/Letter page. Tested by a Playwright PDF check.
 */
import type { ReactNode } from "react";
import type { CharterModel } from "@/export/charter";

function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="border-b border-divider pb-0.5 text-[15px] font-semibold text-ink print:text-[9pt]">{title}</h2>
      <div className="mt-1.5 print:mt-1">{children}</div>
    </section>
  );
}

export function CharterView({ m }: { m: CharterModel }) {
  return (
    <article
      aria-label={`Charter: ${m.title}`}
      className="charter mx-auto flex w-full max-w-[860px] flex-col gap-4 rounded-card border border-border bg-surface p-6 text-[13px] leading-snug text-ink-2 sm:p-8 print:max-w-none print:gap-[4pt] print:rounded-none print:border-0 print:p-0 print:text-[6.5pt] print:leading-[1.22]"
    >
      <header className="flex flex-col gap-1 border-b-2 border-brand pb-2 print:pb-[3pt]">
        <p className="font-mono text-[11px] tracking-[0.04em] text-brand uppercase print:text-[6.5pt]">Splitline charter · {m.date}</p>
        <h1 className="text-[22px] leading-tight font-semibold text-ink print:text-[12pt]">{m.title}</h1>
        <p className="text-[14px] text-ink print:text-[8pt]">
          <strong>Verdict: {m.verdict}</strong> · {m.tierLine}
        </p>
        <p className="print:text-[6.5pt]">{m.reason}</p>
        {m.inBrief && (
          <p className="print:hidden">
            {m.inBrief.text} <span className="text-muted-foreground">({m.inBrief.provenance})</span>
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3 print:gap-x-[10pt] print:gap-y-[4pt]">
        <Block title="Before you pilot">
          {m.conditions.length > 0 ? (
            <ul className="flex flex-col gap-1 print:gap-[1.5pt]">
              {m.conditions.map((c) => (
                <li key={c.title}>
                  <span className="font-medium text-ink">{c.title}</span> ({c.status}). Likely owner: {c.owner}. Effort: {c.effort}.
                </li>
              ))}
            </ul>
          ) : (
            <p>No rule here likely adds a condition before a pilot.</p>
          )}
        </Block>
        <Block title="Who does what">
          <ul className="flex flex-col gap-0.5">
            {m.split.map((s) => (
              <li key={s.step}>
                <span className="font-medium text-ink">{s.step}</span>: {s.owner}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted-foreground">{m.nextReview}</p>
        </Block>

        <Block title="KPIs">
          <ul className="flex flex-col gap-0.5">
            {m.kpis.map((k) => (
              <li key={k.kind}>
                <span className="font-medium text-ink">{k.kind}:</span> {k.name}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="How the team runs it, and what it costs" className="md:col-span-3 print:col-span-3">
          <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-[8pt]">
            {m.levers.map((l) => (
              <div key={l.name} className="flex flex-col gap-0.5">
                <p className="font-semibold text-ink">{l.name}</p>
                <p>{l.setting}</p>
                <p>
                  <span className="font-medium text-ink">Keep in place:</span> {l.keep}
                </p>
                <p>
                  <span className="font-medium text-ink">Direct cost:</span> {l.directCost}
                </p>
                {l.estimates.length > 0 && <p className="text-muted-foreground">Estimates: {l.estimates.join(" ")}</p>}
              </div>
            ))}
          </div>
          {m.reviewEstimates.length > 0 && (
            <p className="mt-1 text-muted-foreground">People checking AI output (estimate): {m.reviewEstimates.join(" ")}</p>
          )}
        </Block>

        <Block title="90-day plan" className="md:col-span-3 print:col-span-3">
          <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-[8pt]">
            {m.phases.map((p) => (
              <div key={p.days}>
                <p className="font-semibold text-ink">
                  {p.days}: {p.title}
                </p>
                <ul className="list-disc pl-4 print:pl-[8pt]">
                  {p.highlights.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground">Gate: {p.gate.join("; ")}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Triggered rules" className="md:col-span-3 print:col-span-3">
          <ul className="gap-x-[12pt] sm:columns-2 print:columns-2 [&>li]:mb-0.5 [&>li]:break-inside-avoid">
            {m.rules.map((r) => (
              <li key={r.title}>
                <span className="font-medium text-ink">{r.title}</span> · {r.status} · {r.instrument} ·{" "}
                {r.sources[0] && (
                  <a href={r.sources[0].url} className="text-brand underline underline-offset-2">
                    {r.sources[0].label}
                  </a>
                )}
                {r.sources.length > 1 ? ` (+${r.sources.length - 1} more on the Governance Map)` : ""}{" "}
                · verified {r.verified}
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <footer className="flex flex-col gap-0.5 border-t border-divider pt-2 text-[12px] text-muted-foreground print:pt-[3pt] print:text-[6.5pt]">
        <p>{[...m.notes, "The full plan with likely owners is in the Markdown charter and the Rollout tab."].join(" ")}</p>
        <p className="font-semibold text-ink">{m.disclaimer}</p>
        <p>Made with Splitline · {m.url}</p>
      </footer>
    </article>
  );
}
