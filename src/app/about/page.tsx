import type { Metadata } from "next";
import { THESIS_SCOPE_DISCLOSURE } from "@/engine/levers";
import { PULSE_FOOTNOTE } from "@/engine/pulse";

export const metadata: Metadata = {
  title: "About",
  description: "The thesis behind Splitline, its limits, and the author.",
};

const LIMITS = [
  "Indicative triage only, not legal advice. Rules carry a status, sources and a last-verified date; confirm with your privacy office or counsel.",
  "The tier is an AIA-inspired indicative tier, not an official Algorithmic Impact Assessment.",
  "The language model never decides tiers, rules, verdicts, split owners or scores. A deterministic engine does.",
  "The thesis is about established firms and machine-learning systems in core work; Splitline applies its logic to single use cases.",
  `The Reinforcement Pulse is illustrative, not validated. ${PULSE_FOOTNOTE}`,
  "Living Lab metrics are an own log-based operationalization: illustrative, not validated.",
  "Every organization and person in the demo is fictional.",
];

/** SPEC §4: thesis in about 150 words, limits (with the scope disclosure), About the author. */
export default function AboutPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[40px]">About Splitline</h1>
        <p className="text-[17px] leading-relaxed text-ink-2">
          Splitline takes a proposed AI use case to an operating model you can put in front of a steering committee, then
          helps you check whether the human–AI work is reinforcing itself after launch.
        </p>
      </header>

      <section aria-labelledby="thesis" className="flex flex-col gap-3">
        <h2 id="thesis" className="text-2xl font-semibold text-ink">
          The thesis in brief
        </h2>
        <div className="flex flex-col gap-3 text-[16px] leading-relaxed text-ink-2">
          <p>
            The operating-model logic comes from the M.Sc. thesis <cite>Holding the Paradox</cite>. Its outcome is the{" "}
            <em>reinforcement</em>: how strongly automation and augmentation feed each other, from vicious to virtuous. Two
            directions make it up. Automation feeds augmentation with freed capacity and data on where the machine does well or
            fails; augmentation feeds automation with expertise and corrections. The reinforcement is the{" "}
            <strong className="font-semibold text-ink">minimum of the two</strong>, so a strong direction cannot make up for a
            weak one.
          </p>
          <p>
            Three levers drive it, each inside a guardrail that keeps its opposite: decentralized decision rights over the split
            (with a shared platform), mutual adjustment (with a standardized base), and integration of automation and
            augmentation work (with retained differentiation). In its direct effect, each lever is at best neutral and often costly for one kind of work; the gain comes
            later and indirectly, so Splitline always shows that cost. The split itself moves over time.
          </p>
        </div>
      </section>

      <section aria-labelledby="limits" className="flex flex-col gap-3">
        <h2 id="limits" className="text-2xl font-semibold text-ink">
          Limits
        </h2>
        <p className="rounded-card bg-subtle p-4 text-[15px] text-ink-2">{THESIS_SCOPE_DISCLOSURE}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink-2">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="author" className="rounded-card border border-border bg-surface p-6">
        <h2 id="author" className="text-lg font-semibold text-ink">
          About the author
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Splitline is a portfolio product by <strong className="font-semibold text-ink">Julius Wölki</strong>. It builds on his
          M.Sc. thesis <cite>Holding the Paradox: How Organizational Design Shapes the Automation-Augmentation Reinforcement in
          Established Firms</cite> (University of Passau).
        </p>
      </section>
    </main>
  );
}
