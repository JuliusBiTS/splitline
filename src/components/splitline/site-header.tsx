"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./chrome";

/** Main navigation (SPEC §4, ADR-0010). Order is fixed. */
export const MAIN_NAV = [
  { href: "/", label: "Presets" },
  { href: "/case/new", label: "Start your own" },
  { href: "/lab", label: "Living Lab" },
  { href: "/pulse", label: "Pulse" },
  { href: "/sources", label: "Governance Map" },
] as const;

/** True when `pathname` sits under `href`. Presets (`/`) also covers the preset workspaces. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/preset/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Reads the current path (needs Suspense on dynamic routes under Cache Components). */
export function SiteHeader() {
  return <SiteHeaderView pathname={usePathname() ?? "/"} />;
}

/** Site header: skip link, logo, main nav. Below `md` the nav folds into a disclosure menu. */
export function SiteHeaderView({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const links = (onNavigate?: () => void) =>
    MAIN_NAV.map((l) => {
      const active = isNavActive(l.href, pathname);
      return (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "inline-flex min-h-10 items-center rounded-control px-2 text-[15px] text-ink-2 hover:text-ink",
              active && "font-semibold text-brand hover:text-brand",
            )}
          >
            {l.label}
          </Link>
        </li>
      );
    });
  return (
    <header className="border-b border-divider bg-surface">
      <a
        href="#main"
        className="sr-only rounded-control bg-brand px-4 text-on-brand focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:inline-flex focus:min-h-10 focus:items-center"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-10 lg:px-20">
        <Link href="/" aria-label="Splitline home" className="inline-flex min-h-10 items-center">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-4 lg:gap-6">{links()}</ul>
        </nav>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-control text-ink hover:bg-chip md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon aria-hidden className="size-5" /> : <MenuIcon aria-hidden className="size-5" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      <nav id="mobile-nav" aria-label="Main" className={cn("border-t border-divider px-4 pb-3 md:hidden", !open && "hidden")}>
        <ul className="flex flex-col">{links(() => setOpen(false))}</ul>
      </nav>
    </header>
  );
}
