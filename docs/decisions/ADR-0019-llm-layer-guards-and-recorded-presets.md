# ADR-0019: LLM layer, guards, case token and recorded presets

- **Status:** Accepted · **Date:** 2026-11-26

## Context
Phase 5 adds the only model-facing code: `/api/decompose` (description → proposed subtasks) and `/api/narrate` (engine facts → narrative), with the limits of ADR-0008. Several points were open in SPEC §8 and ADR-0008:
- how the case token is signed and how reuse is detected;
- what the narration guard checks beyond rule IDs and statutes;
- what the server narrates from;
- what happens when a recorded decomposition would change a preset's exact golden tier (ADR-0004).

## Decision
1. **Client.**
   - `MODEL_ID = "claude-sonnet-5-5"` in `src/llm/client.ts`.
   - SDK retries are off. The SPEC §8 rules are applied once:
     - a 429 with `retry-after` ≤ 10 s is retried once;
     - a transient 5xx or connection error is retried once after 1 s;
     - `ramp_limit_exceeded` is never retried;
     - `enforced_spend_limit_reached` (and `contract_spend_limit_reached`) is never retried.
   - Errors are told apart by `APIError.errorCode` and status, never by message text.
   - Timeout 45 s; `maxDuration` 200 s on the routes.
2. **Structured output.**
   - `messages.parse()` + `zodOutputFormat()` with a loose schema (no min/max/regex).
   - The result is then checked against the strict engine schema (`DecompositionSchema`, `NarrativeSchema`).
   - A schema, grounding or refusal failure gets one retry, listing the problems in a `<previous_attempt_problems>` block. After that:
     - decompose → manual entry;
     - narrate → template.
   - The server-side refusal `fallbacks` parameter is not used: the stable `messages.parse()` has no `fallbacks`. A refusal is treated like a schema failure.
   - Effort: `medium` for decompose, `low` for narrate (the eval checks whether this holds).
3. **Grounding.**
   - Each proposed subtask carries a `sourceQuote` that must appear verbatim in the description (case, whitespace and typographic quotes normalized; at least 8 characters).
   - Quotes are returned as `grounding` for step 3. They never enter the confirmed decomposition, so they never reach a share link (ADR-0008).
4. **Prompts.**
   - `src/llm/prompts/*.md`, loaded from disk and traced into the API functions (`outputFileTracingIncludes`).
   - The system prompt is the cached prefix (`cache_control` on the last system block).
   - User text sits in `<intake>`, `<process_description>` or `<engine_facts>` blocks declared as data. Tags that would close a block early are stripped.
   - The narrate prompt holds the status glossary, i.e. the rule context: how to word each effective status.
5. **Narration input.**
   - `/api/narrate` takes the structured intake (`IntakeStructuredSchema`, strict: no `processDescription`), the confirmed decomposition and an optional case token.
   - The server recomputes `computeCase()` itself; the client never sends results.
   - `src/engine/structured-intake.ts` adds a fixed placeholder description so the engine API stays unchanged. A test shows the result is identical for every preset.
   - The model sees `NarrationFacts`: manager language (ADR-0018), plain owner and lever labels, rules by short source name and status label, no IDs.
6. **Guard** (`src/llm/guard.ts`, lexicon `src/llm/statute-lexicon.ts`, one entry per catalogue rule, test-enforced). Violations:
   - a statute name whose rules did not trigger;
   - any rule-ID-shaped token (triggered or not, since ADR-0018 bans IDs from the main view) or subtask ID;
   - "compliant", "you must", "must comply", "legal advice";
   - a PROPOSED bill named in a sentence without "proposed" (C-36 also matches "PPCDA");
   - "required by law", "legally required" and "AIA tier/level/score";
   - laws that never apply here, whatever triggered: AIDA, Artificial Intelligence and Data Act, Bill C-27, EU AI Act, GDPR;
   - thesis jargon on the main view: P1–P4, Table 4, Section n, reinforcement, mutual adjustment, decision rights (ADR-0018);
   - a lever text that does not name its guardrail (the words before the colon) or its direct cost (opening words of `DIRECT_COST_PLAIN`), since `02_*` §1.7 says the cost is never hidden.

   REF-AIA-TIER always triggers, so its lexicon entry allows no names: "DADM" and "Algorithmic Impact Assessment" count only when a DADM rule triggered. HC-SAMD-01 is worded "likely triggers a classification check" in the facts (research §2.9), not "applies". The template shortens only the lever setting, never the guardrail or the direct cost.

   "AIA" counts as a mention of the official DADM assessment, except in the tier label "AIA-inspired". The case title and step names typed by the user are masked first. Two failed attempts → `templateNarrative()`, which is built from the same facts and passes the guard for every fixture case (tested).
7. **Case token** (resolves ADR-0008's open point).
   - A new env var `CASE_TOKEN_SECRET` (at least 32 characters) signs an HMAC-SHA-256 token over `{ jti, exp }` with a 30-minute life.
   - The token carries no case data.
   - Upstash `SET NX` on the `jti` makes it single use. Reuse is rejected: the second narrate call counts as a run.
   - Without the secret, live mode stays off.
8. **Gates.**
   - Order: body (Zod, 32 kB cap, unexpected keys rejected) → kill switch (`LIVE_MODE_ENABLED`, key, secret, Upstash) → spend suspension → 10 runs per IP per hour (runs only) → `DAILY_LIVE_RUN_CAP` (every live call) → model.
   - After `enforced_spend_limit_reached`, a Redis flag turns live mode off for 6 hours. Then one call probes again.
   - Decompose answers with a friendly message and `fallback: "manual"`:
     - 503 for live mode off or the AI service busy;
     - 429 for the IP limit or the daily cap;
     - 502 when the model output fails our checks.
   - Narrate always answers 200 with the LLM text or the template, plus a notice.
   - `GET /api/live-status` lets Phase 6 decide whether to offer the live path.
   - Logs carry a failure kind only, never a body. Error responses list field paths only.
9. **Recorded presets, option (a)** (approved by Julius 2026-11-26).
   - `scripts/record-presets.ts` stores the raw proposal (model, date, source quotes) in `src/content/presets/recorded/<slug>.json`.
   - A reviewer adds `confirmationEdits`: set / remove / add / confirmNoConsequential, each with a reason. This is what a user does in step 3.
   - `--step apply` writes the confirmed result into the preset JSON.
   - A test asserts `applyConfirmationEdits(raw, edits)` equals the preset decomposition and that the recorded narrative passes the guard.
   - Golden tiers stay exact. Golden split expectations may be re-keyed to the new subtask IDs when the same step moved.
   - The recorded narrative is stored but not rendered until Phase 6 (Summary and charter).
   - **Outcome of the 2026-11-26 recording:** clinical and hiring needed no edits (tier III and IV as recorded). Claims: one edit removes "Key in amounts and dates" (replaced by the AI extraction). Contract: one edit marks "Recommend a position on non-standard clauses" consequential, as the hand-confirmed preset did; without it the case is tier I. All four tiers and verdicts stay exact. The golden split expectations are re-keyed to the new subtask IDs (one entry per subtask). Contract raw score is now 12 (ADR-0004 table updated). Narration passed the guard on the first attempt for all four.
10. **Eval metrics** (`scripts/eval-llm.lib.ts`):
    - "schema-valid" = the last attempt parsed into the strict schema within the one retry (a guard rejection still counts as schema-valid);
    - "guard violations 0" = no narration had to fall back to the template because the guard still rejected it after the retry. First-attempt findings are reported separately.
    - A template fallback is never stored as a preset recording.
11. **Prompt wording after review:** `critical` error cost means serious or irreversible harm to health or safety (rights and livelihood go through `consequential`), because `isSafetyCritical` reads it. A step is consequential when its output directly feeds the decision and an error would change it. `codifiable` means explicit rules or checklists. The narration says the starting split will move and keeps "temporary" for temporary centralization.
12. **Boundary.** A test fails if anything outside `src/llm/`, `src/app/api/` and tests imports the LLM layer, the SDK or the API helpers.

## Consequences
- `.env.example` gains `CASE_TOKEN_SECRET`. SPEC §8, §13 and §15 are updated (v1.2).
- Every live path has a fallback. With `LIVE_MODE_ENABLED=false` the API never calls the model; e2e covers this.
- The guard is stricter than SPEC §8 (IDs and microcopy), so more retries and template fallbacks are possible. The eval reports the first-attempt rate.
- Changing a rule's instrument names means updating `STATUTE_LEXICON`. The lexicon test fails until it is.
- A new preset recording needs reviewed edits before `--step apply`. The recorded files are the evidence that the model proposed and a person confirmed.
