# Splitline

AI operating-model studio: Canadian/BC governance triage + thesis-based human–AI work design + post-launch measurement. Portfolio product by Julius Wölki. Public demo, fictional data only.

@AGENTS.md

## Where truth lives (read before changing behaviour)
- `docs/SPEC.md`: what to build (requirements, types, golden cases).
- `docs/PLAN.md`: phase order, acceptance checks. Work only on the current phase.
- `docs/research/01_legal-landscape-canada-bc.md`: legal rules, status labels, sources.
- `docs/research/02_thesis-to-product-mapping.md`: thesis fidelity rules. Binding.
- `docs/research/05_living-lab-design.md`: Living Lab design.
- `docs/research/06_ux-ui-guidelines.md`: UX principles, components, a11y, copy rules.
- `docs/decisions/`: ADRs. Add one for any decision that changes SPEC or architecture.

## Commands
- `pnpm dev` / `pnpm build`
- `pnpm verify`: typecheck + lint + unit tests (must pass before you say a task is done)
- `pnpm test` (Vitest) · `pnpm test -- <file>` for a single file
- `pnpm test:e2e` (Playwright) · `pnpm test:a11y` (axe via Playwright)
- `pnpm eval:engine`: golden-case table · `pnpm eval:llm`: live LLM eval (needs a key; ask before running, it costs money)

## Architecture rules (IMPORTANT)
- **The LLM never decides tiers, triggered rules, verdicts, split owners or scores.** `src/engine/` decides; the LLM only decomposes text into subtasks (user-confirmed) and writes narrative from engine facts.
- `src/engine/` and `src/lab/` are pure TypeScript: no network, no `Date.now()` without injection, no randomness without a seed.
- Zod schemas are the single source of types (`z.infer`). Validate every API input and every LLM output.
- LLM code lives only in `src/llm/` and `src/app/api/`; the API key is server-only.
- Model ID is a single constant in `src/llm/client.ts` (`claude-sonnet-5-5`). Use `messages.parse()` + `zodOutputFormat()`. Citations are incompatible with structured outputs, so ground extraction with a `sourceQuote` field instead.
- Every live call is rate-limited (Upstash) and has a graceful fallback (cached preset, manual entry, template text). Handle `ramp_limit_exceeded` and `enforced_spend_limit_reached` explicitly.
- No server persistence, no user uploads, no request-body logging.

## Content rules
- Canadian English: colour, centre, licence (noun), cheque; "-ize" endings.
- Legal microcopy: "likely triggers", "consider", "prepare for (proposed)". Never "compliant", "you must", or anything that reads as legal advice. Every result shows "Indicative triage, not legal advice."
- Every rule has `status`, `sources[]` and `lastVerified`. Never show a PROPOSED bill as binding.
- Tier label is always "AIA-inspired indicative tier", never "AIA".
- Thesis: the reinforcement = **min(A→B, B→A)** of the two feeding directions. It is NOT "technical readiness vs absorptive capacity". Levers always come with their guardrail and direct cost. Pulse and Lab metrics are labelled "illustrative, not validated"; Lab metrics are labelled "own log-based operationalization".
- All organizations are fictional. Never use ICBC or any real insurer's name, logo, forms or fee schedules. Synthetic people only.

## Code style
- TypeScript strict; no `any` (use `unknown` + Zod). Named exports. Server components by default; `"use client"` only where needed.
- Tailwind with design tokens from the Claude Design handoff; no inline hex colours outside the tokens.
- UI: shadcn/ui (Base UI) restyled with tokens + Sonner + NumberFlow only; no effect/animation libraries without an ADR.
- Charts are hand-built SVG with a text/table alternative.
- Accessibility is part of done: keyboard path, visible focus, labels, `aria-live` for async results, targets ≥ 24 px.
- Tests sit next to the code (`*.test.ts`); e2e in `tests/e2e/`; golden cases in `tests/golden/`.

## Workflow
- Start each phase in plan mode; read the phase in `docs/PLAN.md` and the referenced SPEC sections; propose a plan before editing.
- Prove completion with evidence: paste the command output, attach screenshots for UI. Do not weaken, skip or delete tests to get green.
- Before closing a phase: run the `plan-reviewer` subagent; for legal content also `legal-content-reviewer`; for thesis logic or copy also `thesis-fidelity-reviewer`. Fix correctness gaps only, not style nits.
- Use the `add-legal-rule` skill to add or change any rule. Run `/release-check` before every production deploy.
- Commit per completed checklist item group: `phase-N: <what>`. Never commit `.env*` (except `.env.example`).
- If the SPEC is wrong or ambiguous, stop and ask; record the outcome in an ADR.

## Gotchas
- Next.js 16 writes `AGENTS.md` on `next dev`; it is imported above. Trust its version-matched docs over memory.
- Vercel Hobby: functions run up to 300 s; keep LLM routes well under that and stream progress steps.
- Prompt-cache the long system prompt + rule context; cached reads don't count toward ITPM.
- Claude API inference geo is only `us`/`global`. The self-assessment page must say so.
- When compacting, always keep: the current phase, the files changed, the failing checks, and open decisions.
