"use client";

/**
 * Reinforcement Pulse (SPEC §7.7, ADR-0009): one respondent answers nine Table 5 items on a 1–7
 * scale; the engine scores them (min of both directions, lagging driver → lever with guardrail and
 * direct cost). Nothing is sent anywhere; answers stay in this browser.
 */
import { useEffect, useRef, useState } from "react";
import { DivergingScoreBars } from "@/components/splitline/diverging-score-bar";
import { formatSigned } from "@/components/splitline/format";
import { QuadrantChart } from "@/components/splitline/quadrant-chart";
import { pulseScoreRows } from "@/components/splitline/scores.logic";
import { readJson, writeJson } from "@/case/storage";
import { buttonVariants } from "@/components/ui/button";
import { PULSE_ROLE_LABELS, QUADRANT_LABELS, scorePulse } from "@/engine/pulse";
import { PulseRoleSchema, type PulseResult, type PulseRole } from "@/engine/types";
import { cn } from "@/lib/utils";
import { missingItems, PULSE_GROUPS, restoreAnswers, toPulseInput, type PulseAnswers, type PulseItemId } from "./pulse-logic";

const STORAGE_KEY = "splitline:pulse";
const SCALE = [1, 2, 3, 4, 5, 6, 7] as const;

export interface PulseItemText {
  id: PulseItemId;
  text: string;
  /** Scale endpoints and midpoint, per item (Table 5). */
  anchors: { low: string; mid: string; high: string };
}

function ScaleQuestion({ item, value, onChange }: { item: PulseItemText; value?: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-divider pt-4">
      <legend className="text-[15px] text-ink">
        <span className="mr-2 font-mono text-xs font-medium text-muted-foreground">{item.id}</span>
        {item.text}
      </legend>
      <div className="flex flex-wrap items-center gap-1.5">
        <span aria-hidden className="mr-1 text-[13px] text-muted-foreground">
          1 = {item.anchors.low}
        </span>
        {SCALE.map((n) => (
          <label
            key={n}
            className={cn(
              "inline-flex size-10 cursor-pointer items-center justify-center rounded-control border text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-brand",
              value === n ? "border-brand bg-brand text-on-brand" : "border-border-strong bg-surface text-ink hover:bg-chip",
            )}
          >
            <input
              type="radio"
              name={item.id}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
              aria-label={`${n}${n === 1 ? ` (${item.anchors.low})` : n === 4 ? ` (${item.anchors.mid})` : n === 7 ? ` (${item.anchors.high})` : ""}`}
            />
            <span aria-hidden>{n}</span>
          </label>
        ))}
        <span aria-hidden className="ml-1 text-[13px] text-muted-foreground">
          7 = {item.anchors.high}
        </span>
      </div>
      <p aria-hidden className="text-[13px] text-muted-foreground">4 = {item.anchors.mid}</p>
    </fieldset>
  );
}

function Result({ r, itemTexts }: { r: PulseResult; itemTexts: Map<PulseItemId, string> }) {
  const lag = r.laggingDrivers;
  return (
    <div className="flex flex-col gap-6">
      <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
        {r.labels.perspective} · answered as {PULSE_ROLE_LABELS[r.role]} · {r.labels.short}
      </p>
      <p className="text-lg font-semibold text-ink">{QUADRANT_LABELS[r.quadrant]}</p>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <QuadrantChart title={`Reinforcement Pulse result (${r.labels.short})`} points={[{ label: "Your team", a: r.a, b: r.b }]} />
        <div className="flex flex-col gap-4">
          <DivergingScoreBars rows={pulseScoreRows(r)} caption={`Reinforcement Pulse · ${r.labels.short} · ${r.labels.perspective}`} />
          <p className="text-[15px] text-ink-2">
            Reinforcement is the weaker of the two directions: {formatSigned(r.reinforcement)}. A strong direction cannot make up for a
            weak one.
          </p>
          <details className="text-sm text-ink-2">
            <summary className="min-h-6 cursor-pointer font-medium text-brand">Show the numbers</summary>
            <table className="mt-2 w-full max-w-md text-left">
              <caption className="sr-only">Pulse scores</caption>
              <thead className="text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 font-medium">Score</th>
                  <th scope="col" className="py-1 font-medium">Value (−1 to +1)</th>
                </tr>
              </thead>
              <tbody>
                <tr><th scope="row" className="py-1 font-medium">A→B, automation feeds augmentation</th><td>{formatSigned(r.a)}</td></tr>
                <tr><th scope="row" className="py-1 font-medium">B→A, augmentation feeds automation</th><td>{formatSigned(r.b)}</td></tr>
                <tr><th scope="row" className="py-1 font-medium">Reinforcement, min(A→B, B→A)</th><td>{formatSigned(r.reinforcement)}</td></tr>
              </tbody>
            </table>
            <p className="mt-2">Direction score = (mean of the three items − 4) / 3.</p>
          </details>
        </div>
      </div>

      <section aria-labelledby="lagging" className="flex flex-col gap-3">
        <h3 id="lagging" className="text-lg font-semibold text-ink">
          {r.driverCheckRelevant ? "Where to start: the lagging driver" : "The weakest driver to keep watching"}
        </h3>
        {!r.driverCheckRelevant && (
          <p className="text-[15px] text-ink-2">Both directions feed each other. The lowest driver item is still the first place to look if that changes.</p>
        )}
        <ul className="grid gap-4 md:grid-cols-2">
          {lag.map((d) => (
            <li key={d.item} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
                {d.item} scored {d.score} of 7
              </p>
              <p className="text-sm text-ink-2">{itemTexts.get(d.item)}</p>
              <p className="text-base font-semibold text-ink">Lever: {d.leverName}</p>
              <p className="text-[15px] text-ink-2">
                <span className="font-medium text-ink">Guardrail to keep:</span> {d.guardrail}
              </p>
              <p className="text-[15px] text-ink-2">
                <span className="font-medium text-ink">Direct cost:</span> {d.directCost}
              </p>
            </li>
          ))}
        </ul>
        {lag.length > 1 && <p className="text-sm text-muted-foreground">These drivers are tied for the lowest score.</p>}
      </section>

      <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
        <li>{r.labels.roleNote}</li>
        <li>{r.labels.scopeDisclosure}</li>
        <li>{r.labels.footnote}</li>
      </ul>
    </div>
  );
}

export function PulseSurvey({
  items,
  stems,
}: {
  items: readonly PulseItemText[];
  /** Table 5 stems that the A and B items complete. */
  stems: { a: string; b: string };
}) {
  const [answers, setAnswers] = useState<PulseAnswers>({});
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<PulseResult | null>(null);
  const [tried, setTried] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const itemTexts = new Map(items.map((i) => [i.id, i.text]));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage after hydration
    setAnswers(restoreAnswers(readJson(STORAGE_KEY)));
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) writeJson(STORAGE_KEY, answers);
  }, [answers, loaded]);

  const missing = missingItems(answers);
  const set = (patch: PulseAnswers) => {
    setAnswers((a) => ({ ...a, ...patch }));
    setResult(null);
  };

  const submit = () => {
    setTried(true);
    const input = toPulseInput(answers);
    if (!input) return;
    setResult(scorePulse(input));
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-[15px] font-medium text-ink">Your role (context only)</legend>
        <p className="text-sm text-muted-foreground">You answer all nine items either way; the role is shown with the result.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {PulseRoleSchema.options.map((role: PulseRole) => (
            <label key={role} className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-[15px] text-ink-2">
              <input type="radio" name="role" checked={answers.role === role} onChange={() => set({ role })} className="size-5 accent-brand" />
              {PULSE_ROLE_LABELS[role].charAt(0).toUpperCase() + PULSE_ROLE_LABELS[role].slice(1)}
            </label>
          ))}
        </div>
      </fieldset>

      {PULSE_GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`group-${g.id}`} className="flex flex-col gap-3">
          <h2 id={`group-${g.id}`} className="text-xl font-semibold text-ink">
            {g.title}
          </h2>
          <p className="text-sm text-muted-foreground">{g.hint}</p>
          {(g.id === "a" || g.id === "b") && <p className="text-[15px] font-medium text-ink">{stems[g.id]}</p>}
          {g.items.map((id) => {
            const item = items.find((i) => i.id === id);
            return item ? <ScaleQuestion key={id} item={item} value={answers[id]} onChange={(v) => set({ [id]: v })} /> : null;
          })}
        </section>
      ))}

      <div className="flex flex-col gap-3">
        {tried && (missing.length > 0 || !answers.role) && (
          <p role="alert" className="rounded-card border-2 border-st-blocker bg-st-blocker-bg p-4 text-[15px] text-ink">
            {!answers.role ? "Choose your role. " : ""}
            {missing.length > 0 ? `Answer ${missing.join(", ")} to see the result.` : ""}
          </p>
        )}
        <div>
          <button type="button" onClick={submit} className={buttonVariants({ size: "lg" })}>
            See the result
          </button>
        </div>
      </div>

      <section aria-live="polite" aria-labelledby="pulse-result" className={cn("flex flex-col gap-4", !result && "sr-only")}>
        <h2 id="pulse-result" ref={resultRef} tabIndex={-1} className="text-2xl font-semibold text-ink outline-none">
          Your result
        </h2>
        {result && <Result r={result} itemTexts={itemTexts} />}
      </section>
    </div>
  );
}
