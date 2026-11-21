# Handoff: Splitline

## Overview
Splitline: *Design where the machine ends and judgment begins.* A web app for AI enablement and transformation leads in Canada. It takes a proposed AI use case through (1) indicative governance triage (Canada/BC, status-labelled rules with sources), (2) operating-model design (who sets the human–AI split, how it's reviewed, how teams exchange learning, what it costs), and (3) post-launch measurement (Reinforcement Pulse, Living Lab). Audience: busy professionals and recruiters who must see the value in 10 seconds.

## About the design files
Files in `designs/` are **design references built in HTML**. They are prototypes showing the intended look and behaviour, not production code. Recreate them in the target codebase. If none exists, use **React + TypeScript (Next.js or Vite) + Tailwind + shadcn/ui on Base UI** (see Stack). Open any `.dc.html` directly in a browser. `support.js` is the prototype runtime; ignore it for implementation. Each file's logic class (bottom `<script>`) holds the real content and state logic, so read it for data.

## Fidelity
**High fidelity.** The colours, type, spacing, copy and interactions are final. Match them exactly, using the tokens in `tokens.css`. Exceptions: the fictional org names, "verified" dates, and Living Lab metrics other than STP 62% and automation error 4% are placeholder data.

## Stack and library rules
- **shadcn/ui on Base UI** (`@base-ui/react`) for all interactive primitives. Restyle everything with the tokens; never ship the default shadcn look (no default radius, ring, or zinc palette).
- **Sonner** only for passive confirmations: "Charter exported", "Link copied". Never for anything that needs a decision. Toasts must be announced via `aria-live`.
- **NumberFlow** for tier, score (±0.00) and STP/error changes in the What-if drawer and between Living Lab episodes. Disable it under `prefers-reduced-motion: reduce` (render final values). Animate only between values that are actually displayed.
- **Charts are hand-built SVG** (QuadrantChart, DivergingScoreBar). No chart library.
- **Allow-list:** Base UI/shadcn, Sonner, NumberFlow. Ask before adding anything else. Add the `pick-ui-library` skill to `.claude/skills/` with this allow-list.

### Component → primitive map
| Splitline component | Primitive |
|---|---|
| Tabs (Summary · Triage · Operating model · Rollout · Export), Living Lab tabs | Base UI `Tabs` |
| Owner control (Machine / Machine + review / Human) | `ToggleGroup` (single) or `RadioGroup` |
| Judgment / Error cost / Volume | `Select` |
| RuleCard expand | `Accordion` (or `Collapsible`) |
| WhatIfDrawer | `Dialog` styled as right sheet (non-modal acceptable) |
| What-if toggles | `Switch` |
| Reason-code chips | `ToggleGroup` (single) |
| Tooltips on badges/sources | `Tooltip` |
| Toasts | Sonner |

## Global layout
- Desktop artboard 1440 px; page side padding 80 px (Living Lab 40 px). Mobile 375 px, side padding 20 px.
- Header: 64 px desktop / 56 px mobile, bottom border `--divider`. Logo = two 9×20 rects (left filled `--accent`, right 2px outline `--accent`, 2px gap, 2px outer radii) + "Splitline" 18/600, letter-spacing −0.01em.
- Body: IBM Plex Sans, `--ink`, `tabular-nums`, antialiased. Links `--accent`, hover `--accent-hover`.
- Footer on every result screen: **"Indicative triage, not legal advice."** (600, ink) + "All organizations are fictional." 14 px `--secondary`, links Sources · Self-assessment · About.

## Screens

### 1. Landing (`Landing.dc.html`, 1440 + 375)
Purpose: understand the value in 10 s; the preset gallery is the demo.
- Header nav (15 px): Presets, Sources, Self-assessment, About + primary button "Start your own" (40 h, 0 16 px, r4, accent bg, white 500).
- Hero: padding 80/80/56, max-width 920. Eyebrow "For AI enablement and transformation leads in Canada" 14/500 accent. H1 "Design where the machine ends and judgment begins." 56 px / 1.08 / 600 / −0.025em, balance. Sub 20 px / 1.5 `--secondary`, max 720: "Turn an AI idea into a governed, human–AI operating model in 15 minutes, then measure whether it's working."
- Presets: heading "Start from a worked case" 20/600; right note "Each preset opens with full results. Edit anything." 14 secondary. Grid 4 cols, gap 24. Card: 1px `--border`, r8, padding 24, min-h 220, gap 16. Hover: border accent + `--shadow`. Contents: sector (Mono 12/500 uppercase, +0.04em, secondary) → title 20/600 → tier chip (24 h, 1px `--border-strong`, r4, 13/500) + verdict chip (24 h, `--chip` bg, glyph + label) → footer row (top divider, 14/500 accent) "Open preset →" and optional "Try the Living Lab" tint chip.
  - Clinical referral triage · Health authority · Tier III · Go with conditions
  - Contract clause review · Legal tech · Tier II · Go with conditions
  - Hiring & sentiment scoring · HR · Redesign (no tier on card)
  - Claims document intake · Public insurer · Tier II · Go with conditions · "Try the Living Lab"
- "Start your own" strip: 1px dashed `--placeholder`, r8, padding 20/24; title 17/600; "Describe a use case in plain words. You confirm every step before anything is analysed."; outline button "Describe a use case".
- How it works: margin-top 72, padding 64/80, `--subtle` bg; 3 cols gap 48; each has a 2px accent top border, Mono number 01/02/03, title 18/600, body 15/1.55 secondary. Titles: Triage / Design the split / Measure (copy in file).
- Mobile: H1 34/1.12, sub 17, stacked preset cards (padding 16), full-width primary "Start your own" 48 h, steps as a 32 px number column, 44×44 menu button.

**Verdict glyphs** (icons, not colour): Go with conditions = 10 px circle, 2px ink border, left half filled. Redesign = 8 px square, 2px ink border, rotated 45°. Go = filled circle.

### 2. Intake step 3, "Confirm the split" (`Intake.dc.html`)
- Header right: "Claims document intake · Public insurer (fictional) · Draft saved".
- Stepper (max 760): Describe ✓ · Break down ✓ · **3 Confirm the split** (current: 24 px accent circle, white numeral; done: tint circle with accent ✓; connectors 1px `--border-strong`). `aria-current="step"`.
- H1 32/600 "Confirm the split" + sub 16 secondary.
- Banner (`role=status`): tint bg, r4, padding 14/16; 20 px accent "i" disc; "**Review the AI's breakdown.** Nothing is analysed until you confirm."
- Table: 1px border r8. Columns `40px | 1.5fr | 128 | 128 | 128 | 360 | 1.2fr` = # · Subtask · Judgment · Error cost · Volume · Proposed owner · Reason. Header row `--subtle`, 13/500 secondary. Rows min-h 64, 15 px. Selects 36 h × 108 w. Owner = 3-segment control 36 h, 1px `--border-strong`, r4; selected = accent bg + white 500; unselected hover `--chip`. Reason = pill chip 13 px, `--chip` bg, `--ink-2`. Subtask name editable inline.
  1. Classify document · Low/Low/High · Machine · "Rule-like, low cost of error"
  2. Extract fields · Low/Medium/High · **Machine + review** (AI proposed Machine → shows "Owner edited by you · AI proposed Machine", 12/500 accent) · "Errors flow into payment"
  3. Validate totals and dates · Low/Medium/High · Machine · "Deterministic check; flags go to a person"
  4. Check policy eligibility · Medium/High/Medium · Machine + review · "Policy wording needs interpretation"
  5. Approve reimbursement · High/High/Medium · Human · "Final decision affects the claimant"
  - "+ Add subtask" row, 48 h, accent 14/500.
- Bottom bar: live count "5 subtasks · 2 Machine · 2 Machine + review · 1 Human"; buttons Back (outline) and **Confirm split and analyse** (44 h primary).
- After confirm: buttons hide; ProgressNarration card (`aria-live=polite`) shows "Split confirmed by you · analysing" and steps that advance about every 1.1 s: Matching rules for BC and federal scope → Separating proposed rules from rules in force → Mapping the split to guardrails → Costing the operating model. Done ✓ accent; current = 10 px accent ring + 600; pending = 1px `--placeholder` ring, muted. **No spinner.** In production, drive it from real job stages.

### 3. Results Summary, Hiring & sentiment (`Results Summary.dc.html`, 1440 + 375)
- Context: Mono eyebrow "HR · Fernhill Staffing (fictional)", H1 32/600. Header right: "Preset · edits stay in this session" + "Edit inputs".
- Tabs: Summary (active: accent 600, 2px accent underline) · Triage · Operating model · Rollout · Export.
- Grid `1fr | 400px`, gap 40, padding 32/80/48.
- **VerdictCard** (padding 32, r8): label "Verdict" → 40 px/600 "Redesign" with an 18 px diamond glyph (3px stroke) + tier chip "AIA-inspired indicative tier III" → reason 17/1.55 → divider → "How sure: **moderate**. Three sourced rules; your description left data retention open." · "2 rules in force · 1 proposed". Confidence is stated in words; never show percentages.
- **Top conditions** (RuleCards, accordion, first open). Collapsed row: grid `200px | 1fr | 24px`, padding 20/24: StatusBadge · text 16/500 · +/−. Expanded (indent 240): **Why this applies** → **Consider** (action) → source line 13 px: source · "Verified <date>" · "Open source".
  1. Blocker: "Continuous sentiment monitoring of employees is seldom reasonable under BC PIPA (OIPC guidance) → remove or redesign"
  2. Applies: "Hiring decisions need a human final decision and bias testing (BC Human Rights Code)"
  3. Prepare for (proposed): "Prepare explanation on request (Bill C-36, proposed)"
- Aside: **What this design costs** (`--subtle` bg, r8, padding 24; items divided): Recruiter time · Bias testing · Lost feature · Explanation upkeep (copy in file). "Next" card: primary "Try a what-if", outline "Design the operating model".
- **WhatIfDrawer**: closed = vertical handle on the right edge (40×132, "What if… ‹", accent 600, shadow). Open = 440 px right sheet below the header, padding 32, shadow. Switches (40×24; on = accent, off = `--placeholder`): Remove sentiment monitoring · Human final decision on every shortlist · Score candidates only, not employees. Diff chips (strikethrough old → **new**): Redesign → Go with conditions; 1 Blocker → 0 Blockers; Tier III → Tier II (needs the first two switches on); Employees in scope → Candidates only. The verdict and tier on the page update live (animate with NumberFlow/crossfade). "Apply to design" is explicit; nothing persists before it.
- Mobile: tabs scroll horizontally; verdict 30 px; RuleCards collapsed with "Why this applies ›"; sticky bottom bar with a full-width "What if…" (48 h) that opens a bottom sheet.

### 4. Operating model, Claims (`Operating Model.dc.html`)
- Title row: H1 "Claims document intake" + Tier II chip + "Go with conditions" chip. Tabs with Operating model active.
- "Three levers": 3-col grid, gap 24. **LeverCard** (padding 24, r8): Mono 12 accent label "LEVER n · NAME" + "Edit" button → name 20/600 → setting 16/1.5 → divider → Guardrail → Direct cost (highlighted `--subtle` box) → 2-col Monitor (accent dot) / Warn if (blocker triangle).
  - Decision rights: "Claims team sets the split within a shared split register."
  - Coordination: "Fixed data formats and escalation thresholds; monthly split review."
  - Exchange: "Weekly joint session of the AI and claims teams; protected expert time."
  (Guardrail, cost and indicator copy is in the file.)
- **SplitMap**: columns `1.3fr | 1fr | 1fr | 1fr` (Subtask · Machine · Machine + review · Human), cell borders `--divider`. The owning cell gets a 12 px accent dot + reason chip. Note: "Recorded in the shared split register · next review 15 Dec".

### 5. Living Lab (`Living Lab.dc.html`, desktop)
- Header: logo · "Living Lab" · "Claims document intake · Synthetic data"; segmented tabs on the right (`--chip` track, active white with small shadow): Review queue · Autoplay compare.
- **Review queue** grid `232px | 1fr | 400px`:
  - Queue list: rows padding 14/20, title 14/500 + flag 13 secondary; active row tint bg + 3px inset accent bar.
  - **ReviewPanel**, `1fr | 300px`. Left: synthetic receipt on a `--subtle` mat (Coastline Physiotherapy; lines 95.00, 85.00, 85.00, 12.00 in Mono; **TOTAL $289.00** row highlighted with blocker bg + 2px blocker outline). Right: fields (36 h inputs, Mono, confidence in words: High/Medium). Flagged field "Total": label + blocker triangle "Total ≠ sum of lines", 2px blocker-bordered input (`aria-invalid`), source snippet "TOTAL $289.00" highlighted, "Lines sum to **$277.00** (difference $12.00)". Reason-code chips (28 h pill; selected = ink bg, white): 1 Total mismatch · 2 Illegible · 3 Duplicate claim · 4 Out of policy · 5 Other. Actions: Accept AI · **Correct** (primary) · Escalate.
  - Keyboard legend (kbd 22 h, 2px bottom border): A Accept AI · C Correct · E Escalate · 1–5 Reason code · J/K Next / previous. Implement these shortcuts.
  - Right rail (`--rail` bg, padding 24): drift banner (prepare bg, `--drift-text`, triangle) → "Reinforcement Pulse · Episode 2 of 2" → QuadrantChart → DivergingScoreBars → "STP 62% · Automation error 4%" (Mono 15/500).
- **QuadrantChart**: x = A→B (AI team helps claims team), y = B→A, both −1..+1, axes through zero (`--muted`). **Only the top-right quadrant is shaded** (`--accent-tint`), labelled "Mutual reinforcement" (accent 12/600). Episode trail: earlier points hollow (white fill, 2px ink), latest filled ink, dashed connector, direct labels "Ep 1", "Ep 2". No legend. Provide an `aria-label` text summary.
- **DivergingScoreBar**: grid `120px | 1fr | 52px`; track 14 h `--score-track`; 1px ink zero line overshooting 4px top and bottom; bars grow from centre (positive `--score-pos` to the right, negative `--score-neg` to the left; width = |v|×50%); value in Mono with sign (+0.42 / −0.15, true minus sign). Rows: A→B +0.42 · B→A +0.18 · Reinforcement = min(A→B, B→A) +0.18. **The minimum row gets a 2px ink outline and the sub-label "Minimum".**
- **Autoplay compare**: "Replay" button + "Episode n of 3" (steps every 1.4 s). Two cards: Rubber-stamp team vs Coupled team, each with a wide QuadrantChart trail, then STP / Automation error / Reinforcement (Mono 22/500) and a one-line reading. Data is in the logic class. Footnote: "Synthetic simulation for illustration. Higher STP alone does not mean the design is working."

## Component inventory (see `Splitline Design System.dc.html`)
VerdictCard · StatusBadge · RuleCard · SplitMap · LeverCard · DivergingScoreBar · QuadrantChart · WhatIfDrawer · Stepper · ReviewPanel · ProgressNarration · Disclaimer footer.

**StatusBadge** (28 h, or 24 h inline; padding 0 10, r4, 13/500, gap 8, icon + label always):
| Status | fg / bg | Icon |
|---|---|---|
| Applies | #1F4E8C / #EAF1FA | 10 px filled circle |
| Prepare for (proposed) | #8A5300 / #FBF3E4 | 11 px 2px dashed ring |
| Regulator expects | #5B3A99 / #F1ECFA | 8 px square rotated 45° |
| Good practice | #2E6B3E / #EAF4EC | 10 px 2px square outline |
| Blocker | #B42318 / #FDECEA | 12×11 triangle |

## Interactions and state
- Intake: `owners[5]` (enum), `attributes[5]`, `confirmed`, `narrationStep`. An edited flag is derived from the owner differing from the AI proposal. Nothing is analysed before an explicit confirm.
- Results: `openRuleIndex`, `whatIfOpen`, `whatIf {removeSentiment, humanFinal, candidatesOnly}` → derived verdict, tier, diffs; `apply()` commits.
- Living Lab: `tab`, `selectedQueueItem`, `reasonCode`, `fieldValues`, `episode`, `playing`.
- Every AI output is editable. Confirmations are explicit in-page buttons, never toasts.
- Motion: 150–200 ms ease-out for hovers and drawer (slide from right 240 ms). Respect reduced motion everywhere.

## Accessibility (WCAG 2.2 AA)
Text contrast ≥ 4.5:1 (`--muted` #667085 is the lightest text colour allowed). Status is never shown by colour alone. Targets ≥ 24 px (default 36–48). Visible focus: 2px accent outline, 2px offset. Tabs, switch, radio and accordion roles come from Base UI. Charts get text alternatives.

## Copy rules
Canadian English (colour, centre, licence, analyse). Legal wording: "likely triggers", "consider", "prepare for (proposed)"; **never "compliant"**. Every result footer: "Indicative triage, not legal advice." All organizations are fictional.

## Assets
No raster assets. The logo and all icons are CSS/SVG primitives (described above). Fonts: IBM Plex Sans and IBM Plex Mono from Google Fonts.

## Screenshots (`screenshots/`)
01 Landing desktop · 02 Landing mobile (2x) · 03 Intake, Confirm the split · 04 Results desktop · 05 Results mobile (2x) · 06 Results with What-if open (two switches on) · 07 Operating model · 08 Living Lab review queue · 09 Living Lab autoplay compare

## Files
- `tokens.css`: all design tokens
- `designs/Splitline Design System.dc.html`: tokens, accent options (A Evergreen chosen), component specimens
- `designs/Landing.dc.html`, `designs/Intake.dc.html`, `designs/Results Summary.dc.html`, `designs/Operating Model.dc.html`, `designs/Living Lab.dc.html`
- `designs/support.js`: prototype runtime only
