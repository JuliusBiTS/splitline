import Link from "next/link";
import { DISCLAIMER_SHORT } from "@/engine";
import { cn } from "@/lib/utils";

/** Logo: two 9×20 rects (left filled accent, right 2 px accent outline, 2 px gap) + "Splitline". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden focusable={false}>
        <rect x="0" y="0" width="9" height="20" rx="2" fill="var(--sl-accent)" />
        <rect x="12" y="1" width="7" height="18" rx="1.5" fill="none" stroke="var(--sl-accent)" strokeWidth="2" />
      </svg>
      <span className="text-lg font-semibold tracking-[-0.01em] text-ink">Splitline</span>
    </span>
  );
}

/** Footer info links (SPEC §4): About, Sources, Self-assessment. */
export const FOOTER_LINKS = [
  { href: "/sources", label: "Sources" },
  { href: "/self-assessment", label: "Self-assessment" },
  { href: "/about", label: "About" },
] as const;

/**
 * Footer on every page: the disclaimer, the fictional-organizations note, the info links and a
 * small author credit (ADR-0010: the author card itself lives on /about only).
 */
export function DisclaimerFooter({
  links = [],
  credit,
}: {
  links?: readonly { href: string; label: string }[];
  credit?: string;
}) {
  return (
    <footer className="mt-auto border-t border-divider px-4 py-6 sm:px-10 lg:px-20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">{DISCLAIMER_SHORT}</p>
          <p className="mt-1 text-sm text-muted-foreground">All organizations and people in this demo are fictional.</p>
          {credit && <p className="mt-1 text-sm text-muted-foreground">{credit}</p>}
        </div>
        {links.length > 0 && (
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-6 items-center underline underline-offset-2">
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
