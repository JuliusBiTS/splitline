import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseWorkspace } from "@/components/case/case-workspace";

export const metadata: Metadata = { title: "Your case", robots: { index: false } };

/**
 * Live case workspace (SPEC §4). The case lives in the browser, so the server sends a static shell;
 * the client reads the ID (`useParams` suspends under Cache Components) and the stored record.
 */
export default function CasePage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pt-8 pb-24 sm:px-10 md:pb-8 lg:px-20">
      <Suspense fallback={<p className="text-[15px] text-muted-foreground">Loading the case…</p>}>
        <CaseWorkspace />
      </Suspense>
    </main>
  );
}
