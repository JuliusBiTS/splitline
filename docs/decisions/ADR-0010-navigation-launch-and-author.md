# ADR-0010: Navigation, launch host, author presence; design deferred

- **Status:** Accepted · **Date:** 2026-11-20

## Context
SPEC §14 items 4–7 asked four questions:
- Should `/sources` be promoted in the navigation?
- Which visual direction?
- Which domain?
- How prominent should the author be on `/`?

## Decision
1. `/sources` is a main-nav item labelled **"Governance Map"** and is linked from every RuleCard.
2. **Visual direction is deferred to Phase 3:** decided in Claude Design with a 5-second test, and recorded in ADR-0005.
3. **Domain:** launch on a `*.vercel.app` subdomain. A custom domain is optional later and only changes `NEXT_PUBLIC_SITE_URL`.
4. **Author presence:**
   - a small footer credit on every page;
   - an "About the author" card on `/about`;
   - no author card on `/`, which stays product-first.

## Consequences
- Main navigation: Presets · Start your own · Living Lab · Pulse · Governance Map.
- Nothing in Phases 1–2 depends on the deferred design decision.
