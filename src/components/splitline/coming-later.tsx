import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Placeholder for a main-nav route that lands in a later phase (ADR-0017), so the nav never 404s. */
export function ComingLater({ title, text }: { title: string; text: string }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-4 px-4 py-16 sm:px-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[40px]">{title}</h1>
      <p className="text-[17px] leading-relaxed text-ink-2">{text}</p>
      <p className="text-[15px] text-muted-foreground">This part arrives in a later release. Until then, open a preset.</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "w-fit" })}>
        Browse the presets
      </Link>
    </main>
  );
}
