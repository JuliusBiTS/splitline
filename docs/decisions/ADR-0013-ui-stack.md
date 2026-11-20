# ADR-0013: UI stack: shadcn/ui on Base UI, Sonner, NumberFlow

- **Status:** Accepted · **Date:** 2026-11-20
- **Note:** requested as "ADR-0006-ui-stack". ADR-0006 was already taken by the intake decision and ADR-0012 by the rule predicates, so this is ADR-0013.

## Context
Splitline needs accessible primitives: dialogs, drawers, tabs, popovers, toggles, form controls. WCAG 2.2 AA is part of done (SPEC §12, `06_*` §6). It should not hand-roll focus management, and it must keep the calm enterprise aesthetic (`06_*` §1.6): no gradients-as-content, no AI sparkle clichés. Many component and effect libraries ship a recognizable default look or decorative motion that would undercut that, and the Phase 3 design tokens.

## Decision
**Allowed:**
- **shadcn/ui on Base UI** (the shadcn default primitive layer) as the accessible component base. Components are copied into the repo and **always restyled with our design tokens**, never shipped with the default shadcn look.
- **Sonner** (via `shadcn add sonner`) for the few toasts we need, e.g. "Charter exported" and "Live mode unavailable".
- **NumberFlow** (`@number-flow/react`) for animated tier and score changes, e.g. What-if diffs and Pulse scores. It must respect `prefers-reduced-motion`: no animation when reduce is set.

**Optional later (each needs only a note in the PR, no new ADR):**
- shadcn **Drawer** (Vaul) for the mobile What-if drawer.
- shadcn **Command** (cmdk) for a ⌘K palette.

**Not allowed:**
- Radix as a separate dependency.
- Magic UI, Aceternity, RareUI, Beautiful UI.
- 21st.dev components.
- Any decorative effect or animation library.

Adding anything outside this list needs a new ADR.

**Installed with the shadcn base and part of this decision, not separate choices:**
- `@base-ui/react`;
- `shadcn` (provides `shadcn/tailwind.css`);
- `cn` (shadcn's class merger);
- `class-variance-authority`;
- `tw-animate-css` (enter/exit transitions of shadcn components only; not for decorative effects);
- `next-themes` (pulled in by the Sonner wrapper);
- the Geist font from the `nova` preset (a placeholder until Phase 3 picks the type).

**Tooling:** Emil Kowalski's `pick-ui-library` skill is installed in `.claude/skills/` as a user-invoked lookup. Its list includes libraries this ADR does not allow (e.g. motion, recharts, torph, Cobe). **This ADR takes precedence.**

## Consequences
- Accessibility comes from Base UI primitives; our tests (axe, keyboard e2e) still gate it.
- Token mapping: until Phase 3 replaces them, shadcn's CSS variables map onto our placeholder tokens in `globals.css`. Phase 3 maps them onto the Claude Design tokens.
- Charts stay hand-built SVG (CLAUDE.md); NumberFlow only animates numerals.
- Review checklist: no default shadcn styling left in a component; reduced motion is honoured.
