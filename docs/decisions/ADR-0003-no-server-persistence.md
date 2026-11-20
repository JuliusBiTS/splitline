# ADR-0003: No accounts, no server persistence, cached presets first

- **Status:** Accepted · **Date:** 2026-11-20

## Context
The tool is a public portfolio demo with unpredictable traffic (recruiters), a small budget and no need for multi-user features in the MVP. Live LLM calls cost money and can fail (rate limits, spend cap).

## Decision
- No login and no database. Cases live in `localStorage`, can be shared via a compressed URL hash, and can be exported as Markdown/JSON.
- The 4 presets are committed JSON (engine output + recorded narration): they render statically with zero API calls.
- Live runs are optional, rate-limited (Upstash; 10 per IP per hour + daily cap) and switchable off via `LIVE_MODE_ENABLED`.

## Consequences
- The demo always works, even with live mode off.
- Team aggregation for the Pulse (n ≥ 5 anonymity) and portfolio views need persistence later; that is out of MVP scope.
