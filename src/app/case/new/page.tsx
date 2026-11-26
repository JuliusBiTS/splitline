import type { Metadata } from "next";
import { IntakeWizard } from "@/components/intake/intake-wizard";

export const metadata: Metadata = {
  title: "Start your own",
  description: "Describe an AI use case, confirm the proposed steps, and get an indicative triage and operating model.",
};

export default function NewCasePage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-10 lg:px-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[36px]">Start your own</h1>
        <p className="max-w-3xl text-[15px] text-ink-2">
          Describe a use case, answer a few questions about its context, and confirm the steps. You get the same results as the presets.
          The case is saved in this browser only.
        </p>
      </header>
      <IntakeWizard />
    </main>
  );
}
