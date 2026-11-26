# ADR-0018: Manager language, plain owner labels and case-specific cost estimates

- **Status:** Accepted · **Date:** 2026-11-26

## Context
Julius reviewed the Phase 4 workspace. For the target user, a non-specialist AI or transformation manager, it reads as too theoretical. The main problems:
- Thesis jargon on the main screens: P1/P2/P3, "Table 4", "Section 6.4", "drives: informed location of the split".
- The "What this design costs" box shows the same abstract Table 4 text on every preset.
- A visible contradiction on the claims preset. The verdict says an adjuster makes every eligibility decision, but the split showed "Decide and write to claimant: Machine + review".
- Conditions are listed twice on the Summary and have no owner or effort.
- Internal IDs (`s3`, `BC-FIPPA-01`, "(P2)") appear in the copy.
- The rollout heading reads "DAYS DAYS 1–30".
- On a direct load, the preset page's `<main>` landmark held only "Loading the preset…". The content sat in a hidden streamed `<div hidden id="S:0">` outside `<main>` until JS swapped it in.

The binding constraints are `02_*` §1. In particular:
- reinforcement = min(A→B, B→A);
- every lever shows its guardrail and direct cost;
- the honesty labels stay;
- the UI states the scope.

CLAUDE.md legal microcopy also applies.

## Decision
1. **Two-layer language.**
   - The main view uses manager terms. The thesis terms move one click deeper, into a collapsible "Research basis" (Base UI accordion, closed by default). It appears on each lever card, under "What it costs you" and at the end of the Operating model tab.
   - Lever names:
     - decision rights → "Who decides what the AI does";
     - coordination → "How the team adjusts the split, and how often" (mutual adjustment first, cadence second; the thesis-fidelity review rejected "How often you re-check the split" because it reduces P2 to the P4 cadence);
     - exchange → "How your experts and the AI team learn from each other".
   - Reinforcement → "Is the AI making your people better, and your people making the AI better?". The plain text keeps the minimum rule: "The weaker direction sets the result, so a strong one cannot make up for a weak one."
   - The Research basis gives min(A→B, B→A) with both directions, the trade-off note, the propositions (P1–P4), Table 4 per lever and the verbatim scope disclosure.
   - The scope disclosure stays always visible as a quiet plain note ("…applied here at team and use-case level. Its propositions are untested."). It is no longer the first line of the tab.
   - `LEVER_NAMES` (thesis names) is unchanged for the Pulse; the workspace uses `LEVER_PLAIN_NAMES`.
2. **Plain owner labels**, 1:1 with `SplitOwner`. The engine split is unchanged.
   - `machine` → "AI does it (spot-checked)";
   - `machine_review` → "AI drafts, a person checks and signs off";
   - `human` → "A person does it (AI may assist)".

   Short forms are used for column headers and toggles. Split reasons say "a person checks the AI output and signs off".
   - **Claims s5:** "Decide and write to claimant" stays `machine_review`. The plain label says the adjuster checks and signs off every case, so the adjuster decides and the verdict sentence is accurate.
   - Making the step `human` would need a new split branch tied to the `human_final_decision` mitigation. That is a thesis/SPEC change for one preset, so it is out of scope here.
   - The other presets were checked for the same mismatch:
     - Clinical: the decision steps are `human`.
     - Hiring: the hiring decision steps are `human`.
     - Contract: makes no such claim.
3. **Case-specific cost estimates** come from `src/engine/costs.ts`, are deterministic and live in `OperatingModel.costEstimates`.
   - Each lever always gets ≥ 1 line, derived from:
     - `teamSetup`: joint-session or steward hours;
     - `readiness`: an enablement line when low;
     - crisis / scope switch: a ratification or centralization cost;
     - the cadence: split-review person-hours;
     - the starting split: no straight-through processing before Day 61 for steps the AI does alone, and calibration on high/critical steps.
   - A fourth topic, "People checking AI output", covers reviewer time on `machine_review` steps grouped by volume, and the steps people keep.
   - On the main view each lever first shows its direct cost in plain words ("Direct cost: …", `DIRECT_COST_PLAIN`, restating Table 4), then the case lines labelled as Splitline's own estimates ("not findings from the thesis"), with the assumption "a unit of about 5–15 people". The guardrail's upkeep (split register) is labelled as such.
   - The thesis `directCost` (Table 4) stays on every `LeverCard` unchanged and is shown in Research basis. The concrete lines are Splitline's own operationalization of that direct cost, not thesis claims.
   - "Keep in place: {guardrail}" sits next to every lever's cost on both the Summary and the lever card.
4. **Planning metadata on rules:**
   - `ownerRole` and `effort` (small / medium / large) on every catalogue rule, enforced by a test.
   - They are shown as "Likely owner" and "Rough effort" with the note "Owners and effort are rough planning estimates, not legal advice. Confirm with your privacy office or counsel."
   - They never change triggers, severity or the verdict.
   - `lastVerified` is unchanged, because no legal content was re-verified.
   - After the legal-content review: the BC-FIPPA-XB owner says the head of the public body (or delegate) *makes* the risk-based decision; HC-SAMD-01 points to the vendor's regulatory affairs (classification falls on the manufacturer); QC-L25-121 names the privacy lead with the product owner; rollout deliverables from IN_FORCE_FUTURE rules start with "Applies from <date>:".
   - `RULE_CATALOGUE_VERSION` is `2026-11-26.1`.
5. **Rollout:**
   - `Deliverable.ownerRole`: the rule's role, or a fixed role per lever and team setup.
   - Subtask names replace IDs. Rule IDs are no longer shown next to deliverables.
   - The phase heading shows `p.days` once.
6. **Tier rationale:**
   - "Steps that bear on a decision about a person: …" replaces "Most consequential subtask: consequential (…)". The steps are named once and without IDs.
   - The ticked mitigations are listed by name, with their effect ("Score reduced by 15% (18 → 15.3)", or "At least 4 of 5 lower the score by 15%").
7. **Summary as a one-screen brief:**
   - the verdict with its plain explanation;
   - "Before you pilot": the top conditions once, as rule cards with owner and effort; the VerdictCard no longer repeats the list;
   - "Who does what";
   - "What it costs you";
   - the next split review.

   "Why this tier" moves to the Triage tab, linked from the verdict card.
8. **`<main>` landmark:**
   - The preset page awaits `params` at page level, without a Suspense boundary. All slugs come from `generateStaticParams`, so params are build-time data and the full workspace is in the static HTML inside `<main>`.
   - This was checked on the production build with JS on and off for all four presets.
   - An e2e test loads a preset without JS and asserts that the `h1` is inside `main`.
9. `ENGINE_VERSION` is `0.3.0` (new `costEstimates`, `ownerRole` and copy changes).

## Consequences
- Thesis fidelity holds:
  - the minimum rule is stated on the main view and in full in Research basis;
  - guardrail and cost are visible for every lever;
  - the honesty labels ("illustrative, not validated", the scope disclosure) are kept, with the verbatim text one click deeper.
- Tests cover:
  - the cost lines (one per lever on every fixture, case-specific across presets, no IDs or thesis labels);
  - rollout owners;
  - the tier rationale wording;
  - rule planning metadata;
  - an e2e check that the Summary, Model and Rollout tabs show no IDs, "(P1)", "Table 4" or "Section 6.4".
- **Cost hours and effort bands are rough assumptions.** If real users need different defaults, change them in `costs.ts` and `EFFORT_LABELS`, not in the thesis constants.
- **Live cases (Phase 6) inherit all of this** through the shared workspace panels.
- **Charter export (Phase 6)** must use the plain labels, cost estimates and owners (SPEC §11).
