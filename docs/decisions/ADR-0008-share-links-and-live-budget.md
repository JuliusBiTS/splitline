# ADR-0008: Share links carry structured data only; live-run accounting

- **Status:** Accepted · **Date:** 2026-11-20

## Context
Share links put the case in the URL hash. The free-text process description (up to 2,000 characters) is where users are most likely to paste something they shouldn't, and links spread.

Separately, SPEC v0.9 said "10 live runs per IP per hour" without defining a run. It also didn't say whether Lab live extraction shares that budget.

## Decision
1. **Share link** = all intake fields except `processDescription`, plus the confirmed decomposition, compressed into the URL hash.
   - The description stays in the creator's `localStorage`.
   - Results still reproduce fully, because the engine never reads free text (ADR-0006).
2. **One run = one `/api/decompose` call.**
   - The call returns a signed, short-lived case token.
   - One `/api/narrate` call per token is free.
   - A narrate call without a valid token counts as a run.
3. **Limits:**
   - 10 runs per IP per hour (Upstash sliding window).
   - `/api/lab/extract` has its own limit: 3 per IP per hour.
   - All live calls count toward `DAILY_LIVE_RUN_CAP` (default 100 per UTC day).
   - `LIVE_MODE_ENABLED=false` still disables everything.

## Consequences
- A recipient can't re-decompose a shared case without retyping a description. That is acceptable.
- Phase 5 needs a secret for signing tokens. Either derive it server-side, or add a new env var (update this ADR and `.env.example`).
- Tests:
  - the share-link round trip drops the description;
  - token reuse is rejected;
  - each limiter and the daily cap return the friendly message.
