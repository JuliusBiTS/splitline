# ADR-0020: Live cases, share-link format, charter export and analytics

- **Status:** Accepted · **Date:** 2026-11-26

## Context
Phase 6 (PLAN) adds `/case/new`, `/case/[id]`, the export and the first deploy. Several points are not settled by SPEC §4–6, §11–12 or ADR-0008:
- how a share link is encoded;
- what "today" a live case uses;
- whether the narrative travels with a share link;
- which values the advanced intake fields take before the user opens "More context";
- how a charter of 20+ deliverables fits on one printed page;
- which analytics properties are allowed.

## Decision
1. **Case storage.**
   - A case is a `CaseRecord` (`src/case/case.ts`): ID, `asOf` date, intake, AI proposal, confirmed decomposition, optional narrative, and `entry` (live / manual / shared).
   - It is saved in `localStorage` only (ADR-0003). Every storage access is wrapped in try/catch.
   - IDs are 10 random characters from an unambiguous alphabet. They name a browser-local record, nothing more.
2. **As-of date.**
   - The engine runs with `today = asOf`, the creation date. The share link carries the same date, so split-review dates reproduce for the recipient.
3. **Share link.**
   - The format is `/case/<id>#v1.<base64url(deflate-raw(JSON))>`, compressed with the platform `CompressionStream`, so no dependency is needed.
   - The payload is `{ asOf, intake: structured intake, decomposition }` with strict Zod schemas. A payload with `processDescription` or any other extra key is rejected on encode and decode.
   - Decoding rejects hashes over 8,000 characters and inflated JSON over 64 kB.
   - The presets encode to under 4,000 characters (test).
   - `v1.` versions the format.
4. **The narrative stays out of share links** (Julius, 2026-11-26).
   - The recipient sees the engine-built verdict explanation (`verdictReason`), plus a note that the AI-written summary and the description stay with the creator.
   - The creator's own local record wins over the hash, so they keep their description and narrative when they open their own link.
   - A copy saved from an earlier share link does not win: a newer link for the same case replaces it, so results always reproduce from the link in hand. A broken newer link never hides a working saved copy.
5. **Narrative provenance.**
   - Recorded preset narratives and live-case narratives are shown on the Summary ("In brief") and in the Markdown charter.
   - The label says who drafted the narrative (AI or template) and that the rules engine, not the AI, set the tier, rules and split.
   - What-if Apply drops the narrative, because it no longer matches the design.
6. **Intake defaults.**
   - Step 2 shows every intake field without a default, which is nine questions plus the pattern checkboxes. SPEC §5 counts "8 essential questions"; the schema needs `businessFunction` and `hosting` as well, so nothing that feeds a rule is hidden.
   - "More context" starts with:
     - `teamSetup = separate_ai_team` and `readiness = medium`;
     - booleans unticked, mitigations unticked;
     - dynamism and reversibility derived.

     The collapsed summary states these defaults.
   - Optional facts are never guessed: `employerSize25Plus` stays unset unless chosen, which keeps the ADR-0012 "confirm headcount" path.
7. **Manual entry.** Live mode off, any `fallback: "manual"` refusal, or a network error opens the same table with three blank rows. The user can retry the AI proposal from there.
8. **Print charter.**
   - `/preset/[slug]/charter` (static, `instant = false` as a print page) and `/case/[id]/charter` (client) render a one-page view on A4 and Letter (Playwright PDF check, all presets).
   - To fit with headroom (at most 90% of a Letter page, tested), the printed plan lists deliverable headlines without owners or phase gates, and reviewer-time estimates stay in the Markdown: the rule title for rule deliverables, the text before the first colon for the others.
   - The printed rule list shows the first source per rule plus "+n more on the Governance Map". The footer prints the Governance Map address, where every rule lists all its sources.
   - The long disclaimer is the final line of both charters, and both carry the plain thesis scope note.
   - The Markdown charter keeps everything: full deliverables with owners, all sources, the narrative.
9. **Analytics.**
   - `<Analytics />` (Vercel Web Analytics, cookieless).
   - Custom events with fixed enumerated properties only:
     - `preset_open {slug}`;
     - `charter_export {format, source}`;
     - `live_run {path: live|manual}`;
     - `lab_autoplay {}` (Phase 7).
   - Never a title, a description, a step name or any typed text.

## Consequences
- Live cases with 7–8 long steps may print on two pages. The one-page acceptance check covers the four presets. If users hit this, shorten the printed split list rather than the guardrails or costs.
- A recipient cannot ask for a new AI narrative (narrate without a token costs a run). That is acceptable under ADR-0008.
- A change to the intake or decomposition schema must keep `v1` links decodable or bump the prefix.
- Tests:
  - share round trip and description stripping;
  - charter sections, guardrails and direct costs, and the absence of IDs, jargon and banned wording;
  - the intake reducer and the floor;
  - e2e for the mocked live path, the manual path, What-if Apply and the PDF page count;
  - axe on the new routes.
