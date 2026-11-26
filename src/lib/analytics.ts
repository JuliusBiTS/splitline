/**
 * Vercel Web Analytics custom events (SPEC §12): cookieless, and the properties are fixed
 * enumerations only. Never a title, a description, a step name or anything the user typed.
 */
import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | { name: "preset_open"; props: { slug: string } }
  | { name: "charter_export"; props: { format: "markdown" | "json" | "print"; source: "preset" | "case" } }
  | { name: "live_run"; props: { path: "live" | "manual" } }
  | { name: "lab_autoplay"; props: Record<string, never> };

export function trackEvent(e: AnalyticsEvent): void {
  try {
    track(e.name, e.props);
  } catch {
    // Analytics must never break the page.
  }
}
