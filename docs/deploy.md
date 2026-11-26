# Deploying Splitline (Vercel Hobby)

You (Julius) create the accounts and set the secrets. Claude never enters keys or tokens anywhere.

## 1. Upstash Redis
1. Create a Redis database at console.upstash.com (region close to the Vercel function region, e.g. `us-west-1` or `us-east-1`).
2. From the database's REST API section, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## 2. Vercel project
1. Import the GitHub repository `JuliusBiTS/splitline` in Vercel.
2. Framework: Next.js. Node.js version: 24.x (Settings → General). Install: `pnpm install`. Build: `pnpm build`.
3. Turn on **Web Analytics** (Analytics tab). It is cookieless; no banner is needed.
4. Production branch: `main`. Every pushed branch gets a preview deployment.

## 3. Environment variables
Set these in Settings → Environment Variables. Use separate values for Preview and Production where noted.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | key | same key, or a separate one | Server-only. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | database | same database is fine | Rate limits and single-use case tokens. |
| `CASE_TOKEN_SECRET` | 32+ random characters | a different value | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `LIVE_MODE_ENABLED` | `false` for the first deploy, then `true` | `true` for the rate-limit test | Kill switch. |
| `DAILY_LIVE_RUN_CAP` | `100` | `30` | Live calls per UTC day, across all IPs. |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` | leave unset, or set to the preview URL | Charter footer and share links. Inlined at build time. |

Live mode stays off when the key, the secret or Upstash is missing, whatever `LIVE_MODE_ENABLED` says.

## 4. Anthropic spend limit
Set a monthly spend limit in the Anthropic Console (e.g. $20). When it is reached, the API answers `enforced_spend_limit_reached`, and Splitline turns live mode off for 6 hours (ADR-0019).

## 5. Checks before production
1. Preview deployment of the `phase-6` branch:
   - live mode off: every page works, and the intake falls back to manual entry;
   - live mode on: one full intake run;
   - the 11th decompose call within an hour from one IP answers "You have used the 10 live runs for this hour…" (costs about $0.30; Julius approves).
2. `/release-check`, report in `docs/evals/release-YYYY-MM-DD.md`.
3. Merge to `main` (Julius), then check the production URL with live mode off and on.
