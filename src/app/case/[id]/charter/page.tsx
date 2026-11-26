import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseCharter } from "@/components/case/case-charter";

export const metadata: Metadata = { title: "Charter", robots: { index: false } };

export default function CaseCharterPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-10 lg:px-20 print:p-0">
      <Suspense fallback={<p className="text-[15px] text-muted-foreground">Loading the charter…</p>}>
        <CaseCharter />
      </Suspense>
    </main>
  );
}
