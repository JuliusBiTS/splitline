# Living Lab Lite: Claims Document Intake (Design Brief)

**Status:** research-backed design brief for preset 4 · **Last updated:** 2026-11-20
**Purpose:** make the thesis tangible in about 2 minutes. Same AI, different organization of the human–AI work → different reinforcement.

---

## 1. Scenario (fictional; never use real insurer branding)

- **Organization:** "Cascadia Public Auto" (CPA), a *fictional* BC public (Crown) auto insurer. Do not use ICBC's name, logo, forms or fee schedules; all values are invented and labelled illustrative. (ICBC's public pages only served as a realism check: customers upload out-of-pocket receipts for reimbursement after a crash, and staff review them within days.)
- **Process:** after a crash, customers upload receipts (treatment, pharmacy, towing, rental car, taxi/rideshare). Today a claims representative re-keys each receipt, checks eligibility rules, and approves reimbursement.
- **AI role:** classify the document → extract fields → validate → propose a pre-check. **The reimbursement decision stays with a human**: it has an economic effect on the customer, and many receipts contain health information.
- **Governance card (engine output):**
  - BC FIPPA PIA required.
  - Treatment receipts are sensitive personal information; processing via the Claude API runs outside Canada (US or global) → supplementary assessment.
  - Indicative tier II: reversible, appeal path, AI only recommends.
  - DADM-style human final decision kept as good practice.
  - Fair-treatment reference applies.
  - Not customer-facing, so `LIAB-CUSTFACING` does not apply.

## 2. Document set (synthetic)

| Type | Share | Typical difficulty |
|---|---|---|
| Treatment receipt (physio, chiro, massage) | ~40% | Provider formats vary; GST usually not charged on health services |
| Pharmacy receipt | ~20% | Clean, structured → good automation candidate |
| Towing invoice | ~10% | Taxes, multiple line items |
| Rental car receipt | ~10% | Multi-day lines, taxes, deposits that should be excluded |
| Taxi / rideshare receipt | ~10% | Screenshots, tips |
| Hard cases (handwritten, non-English, multi-expense, blurry) | ~10% | Should stay human; legibility and policy judgment |

**Fields:**
- `claimNumber` (fictional pattern, e.g. `CPA-` + 7 digits)
- `documentType`
- `providerName`
- `serviceDate`, `invoiceDate`
- `customerName` (synthetic)
- `lineItems[] {description, amount}`
- `subtotal`, `gst`, `pst`, `total`
- `currency`, `paymentStatus`, `language`

**Generation:** write ground-truth JSON → render HTML templates (several layouts per type, a handwriting font, skew and noise variants) → PDF/PNG via Playwright. Use clearly fictional names (no real people) and no real provider names. **Synthetic ground truth doubles as the eval set**, so field-level accuracy can be measured for free.

## 3. Pipeline

1. **Classify + extract (Claude, structured outputs, Zod schema).** Each field returns `{ value, sourceQuote }`.
   - ⚠️ The Citations feature and structured outputs **cannot be combined** (API returns 400). Grounding therefore uses a `sourceQuote` string that the server checks against the document text.
   - PDF cost: roughly 1.5–3k text tokens plus ≤ 1,568 image tokens per page.
2. **Deterministic validation:**
   - claim-number format
   - dates parse, are not in the future, and fall on or after the crash date
   - submission within the policy window (fictional: 180 days)
   - line items + taxes = total (± $0.02)
   - tax plausibility (BC GST 5% / PST 7%, illustrative)
   - duplicate check (provider + date + total)
   - amount above the fictional fee schedule → policy judgment
3. **Confidence = composite of external signals, not the model's self-report.** Practitioners warn that the dangerous field is the *confident wrong* one, and that a safe auto-accept score must come from outside the model, grounded in observed accuracy. Signals:
   - (a) validation pass
   - (b) grounding pass (`sourceQuote` found)
   - (c) document-quality flags (handwritten / non-English / multi-expense)
   - (d) optional: agreement across 2 runs (live mode only)
   - (e) **calibrated against QA samples** per document type
4. **Routing per document type × field according to the Split Register:**
   - `MACHINE` → auto-accept, plus a QA sample
   - `MACHINE_REVIEW` → reviewer confirms flagged fields
   - `HUMAN` → manual entry
5. **Never report STP alone.** Always show automation share *and* automation error rate (from QA) side by side.

## 4. Human review, designed against automation bias

Research basis:
- In a large randomized experiment, early impressions of AI reliability shaped later checking behaviour. People favourable toward automation accepted more incorrect suggestions.
- Practitioners report high acceptance of wrong AI answers when the review is a single approve click.

Design rules:
- **Reasons, not a confidence number:** show *why* a field was flagged (for example "Total ≠ sum of lines", "Handwritten") plus the highlighted source snippet.
- **QA sample = blind entry:** for sampled auto-accepted documents, the reviewer types the values *without* seeing the AI value. This gives an honest automation error rate and is the main anti-automation-bias device.
- **Correction needs one-click reason codes:** `wrong-field`, `format/normalization`, `tax-handling`, `doc-type`, `legibility`, `policy-judgment`.
- **Keyboard-first:** Enter = confirm field, E = edit, J/K = next/previous. Review time per document is logged (simulation input).
- **Decision log:** original value, final value, reason, reviewer role, time → this is the data both feeding directions are computed from.

## 5. Codification: how augmentation feeds automation (thesis B→A)

| Reason code | Codifiable? | Mechanism |
|---|---|---|
| `format/normalization` (e.g. DD/MM vs MM/DD) | Yes | Deterministic normalization rule |
| `tax-handling` (e.g. deposit included in total) | Yes | Validation or normalization rule |
| `doc-type` | Partly | Few-shot example / classification hint (live mode) |
| `wrong-field` | Partly | Few-shot example for that layout |
| `legibility`, `policy-judgment` | No | Stays human; feeds the split ("human-retained") |

- **Decision rights (thesis P1):** the system *proposes* a rule from repeated corrections. The **team approves** it in the Rule Inbox and it is logged on the shared platform (visible register).
- **Guardrail against superstitious learning (thesis 5.5, Puranam):** every codified rule is tracked. If it later causes errors on QA samples, it is flagged and auto-suspended.

## 6. Episodes, split review and metrics (own operationalization; label it so)

**Episode** = a batch of documents processed under a fixed split (demo: 8–10 documents). Thesis 6.4 suggests the task-episode as the unit of analysis.

**A→B (automation feeds augmentation)**, each sub-indicator a signed net change between episodes, scaled to −1..+1, then averaged:
- a1 **freed capacity used for judgment:** Δ share of reviewer time on judgment cases (≈ Table 5 item A1)
- a2 **better information on hard cases:** Δ reviewer accuracy on hard cases when failure-pattern hints are shown (≈ A2)
- a3 **noise penalty:** Δ share of false flags; it goes negative when unfiltered output floods reviewers. This is the thesis's "high exchange, negative reinforcement" case (≈ A3 / erosion).

**B→A (augmentation feeds automation):**
- b1 **automated output quality:** Δ field accuracy of auto-accepted output (QA) (≈ B1)
- b2 **range of automatable work:** Δ share of document types and fields in `MACHINE` after the split review (≈ B2)
- b3 **reliability of what the system learns:** share of codified rules without regressions, minus suspended rules (≈ B3)

**Reinforcement = min(A→B, B→A)**, shown on the same 2×2 as the Pulse survey. An info icon explains the mapping to Table 5 and the label: *"Illustrative log-based proxy derived from the thesis's task-episode measure; not validated."*

**Split Review (thesis P2, monthly in real life):**
- After each episode, the screen proposes moves, for example "Pharmacy receipts → MACHINE (QA error 0/12, threshold ≤ 2%)" or "Rental receipts stay MACHINE_REVIEW (deposit errors)".
- The team accepts or rejects; the change log is visible.

**Drift banner:** if STP rises while the reinforcement falls → "Automation is growing, the coupling isn't."

## 7. Demo modes

1. **Guided (default, about 2 min):** the user reviews Episode 1 (8 docs) → approves 2 proposed rules and a split move → Episode 2 runs on pre-recorded outputs with the rules applied → dashboard updates.
2. **Autoplay comparison (killer demo):** the same AI, with two simulated teams:
   - **"Rubber-stamp team":** approves without blind QA, no reason codes, no split review. Result: STP high, B→A ≈ 0, hidden error rate rises.
   - **"Coupled team":** blind QA, codification, monthly split review. Result: STP rises a bit more slowly, error rate falls, reinforcement is positive.

   This mirrors the thesis's core message and the Krakowski et al. (2026) field-experiment logic: manipulate the organization, not the technology.
3. **Live mode (rate-limited):** run Claude on one synthetic document to show the pipeline is real.

**Pre-recorded runs:** run Claude once over the whole synthetic set at build time and commit the outputs. This keeps the demo free, deterministic and honest: the errors are real model errors, not invented ones. Re-record when the model changes.

## 8. What the preset feeds back into the main tool

- Its Split Register, Rule Inbox and Decision Log are concrete examples for the **Decision Rights / Coordination / Exchange cards** of the Operating Model.
- The Pulse survey for this preset is pre-filled with values consistent with the log metrics, so the two measurement routes (survey vs logs) can be compared.

## Sources
- Hyperscience, confidence and HITL: https://www.hyperscience.ai/?p=14167
- rets.ai, confidence scores: https://rets.ai/blog/confidence-score-ai-extraction-needs-human
- Microsoft Foundry, confidence + grounding routing (Oct 2026): https://devblogs.microsoft.com/foundry/content-understanding-confidence-grounding-hitl/
- LandingAI, HITL review workflows (logging pattern): https://landing.ai/llms/building-human-in-the-loop-review-workflows-for-document-ai
- Decerto, STP in claims (benchmark context): https://www.decerto.com/us/post/ai-claims-processing-the-complete-2026-guide-for-us-carriers
- Bridgenext, why IDP alone doesn't fix claims: https://www.bridgenext.com/blog/idp-in-insurance-claims-whats-missing-and-what-works/
- Bias in the Loop (Harvard Data Science Review 2026, preprint 2025): https://anguilla.dbs.ifi.lmu.de/publications/bek+26/
- Duolingo talk, discernment vs approval (AI Engineer World's Fair 2026): https://www.ai.engineer/talks/CDqzWpwkSls-build-ai-systems-discernment-not-approval
- Claude docs, citations (incompatibility with structured outputs): https://platform.claude.com/docs/en/build-with-claude/citations
- Claude docs, PDF support (limits, tokens per page): https://platform.claude.com/docs/en/build-with-claude/pdf-support
- ICBC, public claims pages (realism check only): https://icbc.com/claims/report-view/check-claim-status
