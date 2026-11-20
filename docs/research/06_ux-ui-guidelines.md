# UX/UI Guidelines (input for Claude Design and Claude Code)

**Last updated:** 2026-11-20 · English, so it can go straight into Claude Design and the repo.

---

## 1. Design principles (ranked)

1. **Decision first, evidence on demand.** Every results screen opens with the decision (Go / Go with conditions / Redesign / Stop), the 3 conditions that matter, and what the design costs. Rules, reasoning and sources sit one click deeper (progressive disclosure). SaaS guidance: start dashboards with the decision, not the chart.
2. **Value in 10 seconds.** The empty state *is* the demo: a gallery of 4 presets that open instantly (cached). Practitioners consistently name empty states as the cheapest, highest-leverage activation surface.
3. **Calibrated trust, not maximum trust.** Show *why* (trigger conditions, source snippets) and *how sure*, in words and status labels instead of fake-precise numbers. Visible reasoning alone can inflate trust, so pair it with clear limits and an easy override.
4. **Human in control, visibly.** Every AI output is editable. The task decomposition must be confirmed before analysis (the tool dogfoods its own human-in-the-loop principle). Overrides are one click and logged.
5. **Honesty as a feature.** The "What this design costs" box, status labels (proposed vs in force) and "illustrative, not validated" notes are designed elements, not footnotes.
6. **Calm enterprise aesthetic.** Generous whitespace, one accent colour, dense only where scanning matters (tables). No gradients-as-content, no AI sparkle clichés.
7. **Accessible by default:** WCAG 2.2 AA (see §6).
8. **Exports are first-class.** The 1-page charter must look as good printed as on screen.

Cross-check against Microsoft's *Guidelines for Human-AI Interaction* (Amershi et al., 2019), especially:
- make clear what the system can do and how well;
- support efficient correction;
- make clear why the system did what it did;
- convey the consequences of user actions.

## 2. Information architecture

| Route | Purpose | Notes |
|---|---|---|
| `/` | One-line value proposition, preset gallery (4 cards), "Start your own", 30-second "How it works" | Above the fold on a laptop; presets open in under 1 s |
| `/case/new` | Intake stepper: **Describe → Context → Confirm split** | Side panel previews "What we'll check" live; "Don't enter personal information" banner |
| `/case/[id]` | Results workspace: **Summary · Triage · Operating model · Rollout · Export** | Summary is the default; the What-if drawer is reachable from every section |
| `/lab` | Living Lab: Review queue · Rule inbox · Split register · Dashboard · Autoplay compare | Desktop-first; mobile shows dashboard and autoplay only |
| `/pulse` | Reinforcement Pulse survey + 2×2 result | Works standalone for any team |
| `/sources` | Every rule with status, source link, last verified | Doubles as the public "Canada AI Governance Map" |
| `/self-assessment` | The tool assessed by its own engine | Strong trust signal |
| `/about` | Thesis in 150 words, limits, author, contact | Link to LinkedIn; no CV PDF needed |

## 3. Core components

- **VerdictCard:** verdict, indicative tier badge, top 3 conditions, "What this design costs", primary action (Export charter).
- **StatusBadge:** icon + text, never colour alone. Values: `Applies` · `Applies from <date>` · `Prepare for (proposed)` · `Regulator expects` · `Mandatory for <scope>` · `Good practice` · `Reference`.
- **RuleCard:** why it triggered (the matched intake facts) → actions to consider → source link + "verified <date>".
- **SplitMap:** a table of subtasks × {Machine / Machine + review / Human} with a reason chip per row. Editable, with "the split will move" and a review date.
- **LeverCard** (×3): setting → guardrail → direct cost → monitoring indicator → warning indicator.
- **DivergingScoreBar:** signed −1..+1 bar from a centre zero line. Used for A→B, B→A and the reinforcement (the minimum is highlighted).
- **QuadrantChart (2×2):** both directions on the axes; only the top-right quadrant is shaded positive; the unit is a dot with a trail across episodes.
- **ReviewPanel (Lab):** document image left, fields right. The flagged field shows its reason + highlighted source snippet. Reason-code chips; keyboard shortcuts legend.
- **WhatIfDrawer:** toggles (hosting location, AI decision role, Quebec/Ontario affected, crisis flag, dynamism). Results diff as chips ("Tier II → III", "+2 rules").
- **ProgressNarration** for live runs: named steps ("Breaking the process into subtasks… Checking 24 rules… Drafting charter…") instead of a spinner.

## 4. Visual direction (brief for Claude Design)

- **Base:** cool neutral greys (slate), white surfaces, a single accent. Suggested: a deep teal/evergreen, a subtle nod to BC without postcard clichés. Let Claude Design propose 2–3 options.
- **Semantic colours** reserved for status (applies / prepare / blocker), always paired with an icon and a label; colour-blind-safe diverging palette for signed scores.
- **Type:** a neutral, highly legible sans with tabular numerals (for example Inter or IBM Plex Sans); one weight scale; 8-pt spacing grid.
- **Charts:** hand-built SVG, no chart library; direct labels instead of legends; zero line always visible.
- **Tone of imagery:** none or minimal; diagrams over illustrations.

## 5. Content design

- **Canadian English:** colour, centre, defence, licence (noun) / license (verb), cheque, travelled; "-ize" endings (organize, prioritize). Dates as "November 20, 2026".
- **Plain language first, the term second:** "Who sets the split (decision rights)". Glossary tooltips for thesis terms.
- **Legal microcopy:** "likely triggers", "consider", "prepare for"; never "compliant" or "you must". Footer on every result: "Indicative triage, not legal advice."
- **Numbers:** no false precision. Tiers as I–IV; scores to 2 decimals only in detail views.

## 6. Accessibility checklist (WCAG 2.2 AA)

- Full keyboard path through intake, results and the Lab; visible focus that is never hidden under sticky headers (2.4.11).
- Pointer targets at least 24×24 px (2.5.8). No drag-only interactions (2.5.7). Consistent help location (3.2.6). No re-entering the same info in the stepper (3.3.7).
- Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI and graph elements. Status never by colour alone.
- `aria-live` announcements when async results arrive. Respect `prefers-reduced-motion`.
- Charts have text equivalents (data table toggle).
- Automated check (axe / Playwright) in CI plus one manual screen-reader pass.

## 7. Responsive & performance

- Recruiters open links on phones: landing, preset results (Summary) and the Lab dashboard must read well at 375 px. Intake and the Review queue are desktop-first, with a polite notice on mobile.
- Presets are static: first contentful paint is fast and there are no API calls. Live runs stream named progress steps.
- The print stylesheet for the charter is tested in CI (Playwright PDF snapshot).

## 8. Working with Claude Design: when and how

**Recommendation: after the spec, before the UI build. Not first, not last.**

1. **Spec first (Claude Code, plan mode, interview).** This fixes the screen inventory (§2), the data shown per screen, and the copy rules. Designing before this produces pretty screens with the wrong content.
2. **Then Claude Design:**
   - design system (tokens, the components in §3), then
   - 5 key screens: Landing with presets, Intake step 3 (Confirm split), Results Summary, Operating-model LeverCards, Lab Review + Dashboard.
   - Use realistic content from the presets, not lorem ipsum.
3. **Quick validation:** a 5-second test with 3 people ("What does this tool do? What would you click first?") and one think-aloud with someone from the target role.
4. **Handoff:** Claude Design packages the design into a handoff bundle for Claude Code. Since the June 2026 update there are `/design` and `/design-sync` commands in Claude Code to import designs and keep the design system in sync.
5. **The engine can be built in parallel**, since it has no UI dependency. The UI build starts only after the handoff.

Note: Claude Design usage is metered separately from chat and Claude Code limits.

## Sources
- The Alien Design, SaaS UX (decision first): https://www.thealien.design/insights/saas-ux
- Eleken, SaaS UX principles (clarity, progressive disclosure): https://www.eleken.co/blog-posts/saas-ux-design
- SaaS Hero, UX principles 2026 (empty states, time to value): https://www.saashero.net/design/improve-saas-user-experience-2026/
- Airtribe, designing for uncertainty (answer first, evidence later): https://www.airtribe.live/upskill-for-free/resources/interactive-explainers/ai-ux/designing-for-uncertainty
- Fuselab, AI transparency UX (calibrated trust; NN/g and Microsoft guidelines): https://fuselabcreative.com/ai-transparency-ux/
- p0stman, why showing reasoning can backfire: https://p0stman.com/agent-ux/calibrated-confidence
- TechRepublic, Claude Design update (June 17, 2026): https://techrepublic.com/article/news-anthropic-claude-design-overhaul-enterprise-teams
- Medium, Claude Design export and handoff: https://medium.com/design-bootcamp/claude-design-what-anthropics-new-ai-design-tool-actually-does-6cfb17ae68ca
- Towards AI, Claude Design metering note: https://pub.towardsai.net/anthropic-launched-a-design-tool-that-reads-your-codebase-and-builds-your-brand-into-every-187bc9032433
- Deque, WCAG 2.2 vs 2.1: https://www.deque.com/?p=58077
