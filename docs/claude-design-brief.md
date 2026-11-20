# Claude Design Brief: Splitline (paste into Claude Design)

## Product
**Splitline: Design where the machine ends and judgment begins.**
A web app for AI enablement and transformation leads in Canada. It takes a proposed AI use case through:
1. indicative governance triage (Canada/BC, status-labelled rules with sources)
2. operating-model design: who sets the human–AI "split", how it is reviewed, how the teams exchange learning, and what the design costs
3. post-launch measurement (Reinforcement Pulse, Living Lab).

Audience: busy professionals and recruiters who must understand the value in 10 seconds.

## Design principles (in priority order)
1. Decision first, evidence on demand (progressive disclosure).
2. The empty state is the demo: preset gallery front and centre.
3. Calibrated trust: show why and how sure, in words and status labels, not fake-precise numbers.
4. Human in control: every AI output editable; confirmations are explicit.
5. Honesty as a feature: "What this design costs" and "proposed vs in force" are designed elements.
6. Calm enterprise aesthetic: generous whitespace, one accent colour, dense only in tables. No AI sparkle clichés, no gradient hero.
7. WCAG 2.2 AA: contrast ≥ 4.5:1, status never by colour alone, targets ≥ 24 px, visible focus.

## Visual direction
- Cool neutral greys (slate) on white; **one accent**. Propose 3 options, including a deep teal/evergreen (a subtle nod to British Columbia, no postcard imagery).
- Semantic status colours only for: Applies · Prepare for (proposed) · Regulator expects · Good practice · Blocker. Always icon + text label.
- Diverging, colour-blind-safe palette for signed scores (−1..+1) with a visible zero line.
- Neutral sans with tabular numerals (e.g. Inter or IBM Plex Sans), 8-pt spacing grid, restrained radius and shadows.
- Charts are simple SVG with direct labels, no legends where avoidable.

## Design system components
VerdictCard · StatusBadge · RuleCard ("Why this applies" → actions → source + verified date) · SplitMap (table: subtask × Machine / Machine + review / Human with a reason chip) · LeverCard (setting → guardrail → direct cost → monitoring indicator → warning indicator) · DivergingScoreBar · QuadrantChart (2×2, only the top-right shaded positive, episode trail) · WhatIfDrawer (toggles + diff chips) · Stepper (3 steps) · ReviewPanel (document left, fields right, flagged reason + source snippet, reason-code chips, keyboard legend) · ProgressNarration (named steps instead of a spinner) · Disclaimer footer.

## Screens to design (use the real content below, not lorem ipsum)

1. **Landing:**
   - Headline "Design where the machine ends and judgment begins."
   - One-line sub: "Turn an AI idea into a governed, human–AI operating model in 15 minutes, then measure whether it's working."
   - 4 preset cards:
     - Clinical referral triage: Health authority · Tier III · Go with conditions
     - Contract clause review: Legal tech · Tier II · Go with conditions
     - Hiring & sentiment scoring: HR · Redesign
     - Claims document intake: Public insurer · Tier II · Go with conditions · "Try the Living Lab"
   - "Start your own"; a 3-step "How it works"; footer with Sources · Self-assessment · About.
2. **Intake step 3, "Confirm the split":**
   - Editable table of 5 subtasks for the claims case: classify document; extract fields; validate totals and dates; check policy eligibility; approve reimbursement.
   - Each row has attributes (judgment, error cost, volume) and a proposed owner.
   - Banner: "Review the AI's breakdown. Nothing is analysed until you confirm."
3. **Results Summary (Hiring & sentiment preset):**
   - Verdict: Redesign; tier badge "AIA-inspired indicative tier III".
   - Top conditions: "Continuous sentiment monitoring of employees is seldom reasonable under BC PIPA (OIPC guidance) → remove or redesign"; "Hiring decisions need a human final decision and bias testing (BC Human Rights Code)"; "Prepare explanation on request (Bill C-36, proposed)".
   - "What this design costs" box.
   - Tabs: Summary · Triage · Operating model · Rollout · Export. What-if drawer handle.
4. **Operating model (Claims preset):**
   - Three LeverCards:
     - Decision rights: claims team sets the split within a shared split register.
     - Coordination: fixed data formats and escalation thresholds; monthly split review.
     - Exchange: weekly joint session of the AI and claims teams; protected expert time.
   - Each card shows its guardrail and direct cost; SplitMap below.
5. **Living Lab (desktop):**
   - Review queue item (synthetic physiotherapy receipt; the field "Total" is flagged "Total ≠ sum of lines", with the source snippet highlighted); reason-code chips.
   - Right rail: Dashboard with the QuadrantChart (Episode 1 → 2 trail), DivergingScoreBars for A→B, B→A and the reinforcement (the minimum highlighted), "STP 62% · Automation error 4%", drift banner.
   - Tab "Autoplay compare": Rubber-stamp team vs Coupled team.

## Copy rules
Canadian English (colour, centre, licence). Legal wording: "likely triggers", "consider", "prepare for (proposed)", never "compliant". Every result footer: "Indicative triage, not legal advice." All organizations are fictional.

## Deliverables
Design system (tokens + components) and the 5 screens at 1440 px; mobile (375 px) versions of the Landing and Results Summary. Then hand off to Claude Code.
