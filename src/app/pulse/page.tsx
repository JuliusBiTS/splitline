import type { Metadata } from "next";
import { PulseSurvey } from "@/components/pulse/pulse-survey";
import { pulseItems } from "@/content/pulse-items";
import { PULSE_FOOTNOTE, PULSE_ROLE_NOTE, PULSE_SHORT_LABEL } from "@/engine/pulse";

export const metadata: Metadata = {
  title: "Reinforcement Pulse",
  description: "A nine-item check of whether the AI makes your people better and your people make the AI better. Illustrative, not validated.",
};

/** SPEC §7.7: survey → both scores, 2×2, minimum, lagging driver → lever with guardrail and direct cost. */
export default function PulsePage() {
  const { items, stems, citation } = pulseItems();
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-10 lg:px-20">
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">After launch · {PULSE_SHORT_LABEL}</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[36px]">Reinforcement Pulse</h1>
        <p className="text-[15px] text-ink-2">
          Nine questions about a team that works with an AI system. They place the team on a 2×2: is the AI making your people better, and
          are your people making the AI better? The weaker direction sets the result. If it shows a problem, the lagging driver points to
          the design lever to adjust, with the guardrail to keep and what it costs.
        </p>
        <p className="text-sm text-muted-foreground">
          Your answers stay in this browser; nothing is sent. One person answers all nine items, so the result is a single-perspective
          estimate. {PULSE_ROLE_NOTE}
        </p>
        <p className="text-sm text-muted-foreground">
          {PULSE_FOOTNOTE} {citation}
        </p>
      </header>
      <PulseSurvey items={items} stems={stems} />
    </main>
  );
}
