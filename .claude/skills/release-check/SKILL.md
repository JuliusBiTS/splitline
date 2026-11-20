---
name: release-check
description: Pre-deployment check of legal currency, honesty labels and quality gates for Splitline. Run before every production deploy.
disable-model-invocation: true
---
Run the Splitline release check and write the report to `docs/evals/release-<YYYY-MM-DD>.md`.

1. **Legal currency** (use web search; cite sources in the report):
   - Bill C-36 (PPCDA): current stage on LEGISinfo. If it passed or changed, list the rules affected (FED-C36-*).
   - OPC guidance on assessing third-party service providers: still draft or final?
   - OIPC BC: new guidance, orders or investigations on AI since the last check.
   - BC PIPA amendments in force Aug 1, 2027 (SBC 2025, c. 31): text available? Relevant?
   - Any new federal or BC AI legislation.
   For each item: unchanged / changed → proposed rule updates (do not edit rules here; list them for the `add-legal-rule` skill).
2. **Honesty labels present** (grep and screenshot): "Indicative triage, not legal advice", "AIA-inspired indicative tier", "illustrative, not validated", "own log-based operationalization", "fictional".
3. **Quality gates:** `pnpm verify`, `pnpm test:e2e`, `pnpm test:a11y`, `pnpm eval:engine`; paste a summary.
4. **Ops:** `LIVE_MODE_ENABLED`, `DAILY_LIVE_RUN_CAP` set in Vercel; Anthropic spend limit confirmed by Julius.
5. Verdict: SHIP / FIX FIRST, with a list of the items to fix.
