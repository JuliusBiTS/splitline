# Architecture & Build Notes (verified 2026-11-20)

Input for the later SPEC.md and PLAN.md. Versions and API details were checked against official docs on the date above.

## 1. Stack
- **Next.js 16** (App Router, TypeScript, Turbopack default). 16.4.x is current. Since 16.3, `next dev` writes a version-matched `AGENTS.md` block, so coding agents read the bundled docs that match the installed version.
- **Tailwind CSS** + `lucide-react`; charts as hand-rolled SVG (the 2×2 and the score bars) to avoid a chart library.
- **Claude API** via `@anthropic-ai/sdk`. Model `claude-sonnet-5-5` ($2 / $10 per MTok). Structured outputs through `client.messages.parse()` with `output_config: { format: zodOutputFormat(schema) }`.
  - Schema limits: no `minimum`/`maximum`/`minLength`, no `oneOf`, and `additionalProperties` must be `false`. The Zod helper strips the unsupported constraints and validates them locally.
- **Validation:** Zod schemas shared by the engine, the API and the UI.
- **Tests:** Vitest (engine, rules, Pulse scoring) and Playwright (one end-to-end path per preset).
- **Hosting:** Vercel. Rate limiting with Upstash Ratelimit (works across serverless instances; in-memory limits do not), plus a daily budget cap via an env variable.
- **Persistence:** none on the server. Saved cases live in `localStorage` (wrapped in try/catch); shareable state goes in the URL hash; export as JSON/MD.

## 2. Layering (the key design decision)
```
UI (React)  ──>  /api/decompose  (LLM: process text → subtasks, user confirms)
            ──>  engine (pure TS, deterministic, no network)
                   ├─ rules/      legal triggers as data (id, status, predicate, sources, lastVerified)
                   ├─ tier/       AIA-inspired indicative tier I–IV
                   ├─ design/     split heuristic + 3 lever cards + cost + drift check (thesis logic)
                   ├─ rollout/    90-day plan with monitoring & warning indicators
                   └─ pulse/      Table-5 scoring, min rule, quadrant, lagging driver
            ──>  /api/narrate    (LLM: engine facts → prose for charter; may NOT add rules/tiers)
            ──>  export/         Markdown charter, print CSS, inventory JSON
```
- **The LLM never decides tiers, triggers or scores.** The engine does that, and it can be tested and explained.
- **Narration guard:** after `/api/narrate`, check that every statute or rule ID mentioned is in the engine's triggered set. Otherwise retry once, then fall back to template text.
- **Presets:** engine output plus a pre-generated narration, committed as JSON → zero API cost, instant. A "Re-run live with Claude" button is rate-limited.

## 2b. API & platform facts added 2026-11-20 (they affect design)
- **Citations ⟂ structured outputs:** combining them returns 400. For grounded extraction use a `sourceQuote` field and verify it server-side against the document text.
- **PDF input:** up to 600 pages per request (100 if the context window is under 1M); per page ~1.5–3k text tokens plus ≤ 1,568 image tokens.
- **Rate limits:**
  - Start tier for Sonnet 5.5: 4,000 RPM / 2M ITPM / 400k OTPM. New organizations may begin in a lower *Evaluation tier*.
  - Ramp limits apply to sudden bursts (`ramp_limit_exceeded`).
  - The spend cap returns 429 *without* `retry-after` (`enforced_spend_limit_reached`).
  - Cached input tokens don't count toward ITPM.
- **Vercel Hobby:** non-commercial use; 300 s function default/maximum with Fluid Compute; Web Analytics 50k events/month, cookieless.
- **Upstash Redis free tier** for `@upstash/ratelimit` (sliding window). Confirm current free limits before launch.
- **Next.js 16.3+** writes a version-matched `AGENTS.md` block on `next dev`. Have CLAUDE.md import it (`@AGENTS.md`), since Claude Code reads CLAUDE.md, not AGENTS.md.
- **Claude Design ↔ Claude Code:** handoff bundle from Claude Design; `/design` and `/design-sync` in Claude Code (since June 2026).

## 3. Evals (shows AI-delivery maturity)
- **Golden cases** (about 12: the 4 presets plus edge cases such as federal institution, OSFI bank, Quebec residents, crisis flag, low readiness, no personal data) with expected engine outputs as snapshot tests.
- **LLM evals** (run in CI on a small sample, or locally before release):
  - Schema-valid rate.
  - "No invented statutes" check.
  - Each subtask has the required attributes.
  - Decomposition stability across 3 runs.
- A deterministic gate (pre-commit hook or CI): `pnpm typecheck && pnpm test` must pass.

## 4. Privacy & security of the tool itself
- Banner: "Do not enter personal information. Use descriptions, not real case data."
- Server keeps no request bodies; logs are limited to counts and latency.
- Model calls: Claude API inference runs in the US or globally; there is no Canadian geo → disclose this on the Self-Assessment page. (The engine would flag the tool itself if personal data went in.)
- API key server-side only. Basic prompt-injection hygiene: user text sits in delimited blocks, and the system prompt says to treat it as data.

## 5. Cost envelope
Two calls per live analysis (decompose + narrate) of a few thousand tokens each → on the order of a few cents per run with Sonnet 5.5. A rate limit of about 10 runs per IP per hour plus a daily cap keeps worst-case spend small. Prompt caching on the long system prompt and rule context lowers it further.

## 6. Claude Code working agreements (from Anthropic's best-practice docs)
- **Keep CLAUDE.md short** (under ~200 lines): commands, conventions, architecture rules ("LLM never decides tiers"), "where truth lives" (`docs/research/*`). Put long domain content in `docs/` or skills, not in CLAUDE.md.
- **Spec first:** have Claude interview you, write `SPEC.md`, then build in a *fresh* session from `SPEC.md` + `PLAN.md`. Plan mode for multi-file phases.
- **Every phase ends with a check Claude can run** (tests, typecheck, Playwright screenshot), and evidence is shown, not just asserted.
- Use hooks for must-always rules (for example typecheck after edits); CLAUDE.md is advisory.
- `/clear` between unrelated tasks; after two failed corrections, restart with a better prompt.
- Use a subagent for review against `PLAN.md` before closing a phase (only correctness and requirement gaps, not style).

## Sources
- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- CLAUDE.md / memory docs: https://code.claude.com/docs/en/memory
- Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Models overview: https://platform.claude.com/docs/en/models/overview
- Data residency: https://platform.claude.com/docs/en/manage-claude/data-residency
- Next.js 16.3 release notes: https://nextjs.org/blog/next-16-3
- Next.js release status: https://www.versio.io/de/product-release-end-of-life-eol-vercel-nextjs.html
