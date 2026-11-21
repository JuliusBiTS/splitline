# ADR-0005: Design direction: Evergreen accent, IBM Plex, token mapping

- **Status:** Accepted (design-test findings pending) · **Date:** 2026-11-20

## Context
PLAN Phase 3 asks for a design system and five key screens from Claude Design, handed off to code, with a 5-second test (3 people) and one think-aloud recorded here. The handoff bundle ("Design system accent options") is committed unchanged in `design/handoff/`:
- `README.md`: the screen and component spec;
- `tokens.css`;
- six `.dc.html` prototypes;
- nine screenshots.

ADR-0013 fixes the stack (shadcn/ui on Base UI, Sonner, NumberFlow) and requires that shadcn never keeps its default look.

## Decision

### Direction
- **Accent: A, Evergreen** `#1D5C57`, hover `#123F3B`, tint `#E8F1EF`. White text on it is 7.4:1. It is distinct from every rule-status hue. The two alternatives in the design file were rejected:
  - B Harbour `#24456E` sits too close to the "Applies" blue;
  - C Cedar `#6E4227` sits too close to the diverging-negative orange.
- **Type: IBM Plex Sans** (400/500/600) and **IBM Plex Mono** (400/500), loaded with `next/font/google` in `src/app/layout.tsx`. They replace the Geist placeholder from the shadcn preset. Tabular numerals are on globally.
- **Calm enterprise:**
  - slate neutrals on white;
  - one accent;
  - semantic colour only for rule status;
  - 8-pt spacing;
  - radius 4 px (controls) / 8 px (cards);
  - one shadow level.
- **Light only.** The design has no dark theme, so `globals.css` has no `.dark` block and Sonner is fixed to light.

### Token mapping
- `src/styles/tokens.css` holds every handoff token 1:1 under an `--sl-` prefix. It is the only file in `src/` with colour literals.
  - The prefix is needed because the handoff's `--accent`, `--secondary`, `--muted` and `--border` mean different things from shadcn's variables of the same name.
  - `src/styles/tokens.test.ts` fails if any value drifts from `design/handoff/tokens.css`. That test is the "tokens match the design" acceptance.
- `src/app/globals.css` points every shadcn variable at a token:
  - `--primary` = accent;
  - `--secondary` and `--accent` = `chip` (hover surface);
  - **`--muted` = `subtle` (it stays a surface)**;
  - `--muted-foreground` = `secondary` `#4A5565` (secondary text);
  - `--border` / `--input` = border / border-strong;
  - `--ring` = accent;
  - `--destructive` = blocker;
  - `--radius` = 8 px, with the sm/md steps at 4 px.
- Design utilities exposed through `@theme`:
  - `brand`, `brand-hover`, `brand-tint` and `on-brand` for the accent. The name `accent` stays shadcn's hover surface.
  - `ink`, `ink-2`;
  - `faint` (the design's `--muted` `#667085`, the lightest allowed text colour);
  - `placeholder`, `border-strong`, `divider`, `chip`, `subtle`, `rail`;
  - `st-*` and `st-*-bg`;
  - `drift-text`, `flag-field-bg`;
  - `score-*`;
  - `shadow-elevated`, `shadow-doc`;
  - `rounded-control` / `card` / `pill`.
- Focus is global: a 2 px accent outline with a 2 px offset. Reduced motion shortens all transitions. NumberFlow uses `respectMotionPreference`.
- shadcn primitives added and restyled: Button, Tabs (`line` + `segmented`), Toggle / ToggleGroup (`segment` + `chip`), Select, Accordion (+/−), Dialog (`center`, `sheet-right`, `sheet-bottom`), Switch, Tooltip, Sonner.

### Components (UX §3, handoff inventory)
`src/components/splitline/`:
- StatusBadge
- VerdictCard (+ VerdictGlyph, VerdictChip, TierChip)
- RuleCard
- SplitMap (read view) + SplitEditor / OwnerControl (Intake step 3)
- LeverCard
- DivergingScoreBars
- QuadrantChart
- WhatIfDrawer
- ReviewPanel
- Stepper and ProgressNarration
- Logo and DisclaimerFooter

Logic sits in `*.logic.ts` with tests: status labels, tier wording, split summary, score geometry, quadrant text, step state, review shortcuts, total check, and the what-if chip parse. Components take engine types and labels (`VERDICT_LABELS`, `TIER_LABEL`, `QUADRANT_LABELS`, `LEVER_NAMES`, `STARTING_SPLIT_LABEL`, the Pulse labels) and never re-derive engine decisions. `/dev/components` (noindex) shows every component, fed by the engine on the claims and hiring presets.

### Gap fills and deviations from the handoff
1. **Status labels the design does not style.** SPEC §7.1 has more labels than the design's five badges. These fills keep icon + colour distinct:

   | Label | Colours | Icon |
   |---|---|---|
   | "Applies from <date>" | applies | hollow circle |
   | "Mandatory for <scope>" | applies | filled circle with a white centre |
   | "Regulator draft (consultation until <date>)" | regulator | dashed diamond outline |
   | "Reference framework" and "Mandatory for <scope>; reference elsewhere" | neutral (`chip` / `ink-2`) | ring with a bar |

2. **Blocker badge.** When the effective severity is blocker, the badge reads "Blocker" (as in the design). The RuleCard still shows the underlying status label under the badge and in the source line, so a blocker never hides whether the rule is law, guidance or proposed.
3. **Verdict "Stop"** has no design glyph. It uses a filled square.
4. **Quadrant label.** The design labels the shaded quadrant "Mutual reinforcement". The code uses the engine's thesis term **"Virtuous"** (`QUADRANT_LABELS`, `02_*` §3.7). The axis copy follows the thesis: A→B = automation feeds augmentation, B→A = augmentation feeds automation. It does not use the design's "AI team helps claims team".
5. **Minimum row.** The DivergingScoreBar outlines the direction(s) that set the minimum (`weakerDirection`) with the sub-label "Minimum". The Reinforcement row reads "min(A→B, B→A)".
6. **Accessibility corrections** found by the token contrast test:
   - **Off-switch track:** the design's `placeholder` `#98A2B3` is 2.6:1 on white, below the WCAG 1.4.11 minimum of 3:1. The Switch uses `faint` `#667085` (4.8:1) for the off track instead.
   - **`faint` text:** the design's `--muted` `#667085` is 4.3:1 on `accent-tint`. It is allowed as text only on neutral surfaces; tinted backgrounds use `text-muted-foreground`.
7. **Tier chips always show the full label.** The handoff's compact "Tier III" chips (preset cards, the what-if diff) would hide the "AIA-inspired indicative tier" qualifier from sighted users, which CLAUDE.md forbids. TierChip and the what-if tier diff chip always read "AIA-inspired indicative tier …".
8. **What counts as "in force".** The VerdictCard's rule count names only what binds today as "in force". Future-dated law ("in force from a future date") and regulator drafts are counted separately.
9. **A Blocker badge carries its status.** A Blocker badge outside a RuleCard shows the underlying status after the label ("Blocker · Regulator expects"). Inside a RuleCard the status sits under the badge and in the source line.
10. **VerdictCard (UX §3).** It also carries:
    - the top 3 conditions;
    - "What this design costs" (each lever's direct cost);
    - a primary action slot ("Export charter");
    - the long disclaimer ("…Confirm with your privacy office or counsel.").
11. **Footer links.** The handoff's links (Sources · Self-assessment · About) are not rendered until those routes exist in Phase 4 (`FOOTER_LINKS` in `chrome.tsx`).
12. **Open for Phase 5 (intake).** The confirm-split table follows the design: judgment, error cost and volume are editable. The split heuristic also reads `knowledgeType`, `consequential` and `affectsIndividuals`. Per `02_*` §3.1–3.3 the user must be able to confirm those too, so the Phase 5 intake must add them to the confirm step (thesis-fidelity review, Phase 3).
13. **Placeholder data.** Organization names come from the committed presets (Tidewater Logistics, Cascadia Public Auto), not the handoff's placeholder names. Confidence wording ("How sure: moderate") is specimen copy until the engine provides it.

### Design-test findings
**Pending.** As of 2026-11-20, neither the 5-second test with 3 people nor the think-aloud has been run (Julius). When they are run:
- record per participant what they recalled after 5 seconds (product purpose, the verdict, the next action);
- record the think-aloud's stumbling points;
- record any change made in response, as an amendment to this ADR.

The PLAN Phase 3 item for the test stays open until then.

## Consequences
- Every colour in the app goes through a token. A design change is a `tokens.css` edit plus re-importing the handoff, guarded by the token test.
- Phase 4 composes pages from these components instead of building UI from scratch. The footer links to `/sources`, `/self-assessment` and `/about`, which land in Phase 4.
- Reviewers check that no default shadcn styling remains: no zinc/neutral classes, no `ring-ring/50` focus rings, no default radius.
- The design-test findings may still change copy or layout. Such changes amend this ADR.
