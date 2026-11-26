/**
 * Route handler logic for `/api/decompose`, `/api/narrate` and `/api/live-status` (SPEC §8,
 * ADR-0008, ADR-0019). The `route.ts` files are thin wrappers so this stays unit-testable.
 *
 * Privacy: request bodies are never logged. Logs carry only a failure kind (SPEC §12).
 * Gate order: body → kill switch → spend suspension → per-IP limit (runs only) → daily cap → model.
 */
import { z } from "zod";
import { computeCase } from "@/engine/index";
import { intakeFromStructured, IntakeStructuredSchema } from "@/engine/structured-intake";
import { ConfirmedDecompositionSchema, IntakeInputSchema } from "@/engine/types";
import type { LlmFailure } from "@/llm/client";
import { decompose as realDecompose } from "@/llm/decompose";
import { buildNarrationFacts } from "@/llm/narration-facts";
import { narrate as realNarrate } from "@/llm/narrate";
import { templateNarrative } from "@/llm/narrate-template";
import { CASE_TOKEN_TTL_SECONDS, issueCaseToken, verifyCaseToken } from "./case-token";
import { readLiveConfig, type LiveConfig } from "./config";
import { SPEND_SUSPENSION_SECONDS, upstashStore, type LiveStore } from "./store";

/** Bodies above this are rejected before parsing (an intake with a 2,000-character description is ~5 kB). */
export const MAX_BODY_BYTES = 32_000;

export type NoticeCode = "live_disabled" | "rate_limited" | "daily_cap" | "busy" | "llm_failed";

/** Friendly copy (Canadian English). Every message points to a path that still works. */
export const NOTICES: Record<NoticeCode, string> = {
  live_disabled: "Live mode is off right now. Open a preset, or enter the steps yourself.",
  rate_limited: "You have used the 10 live runs for this hour. Try again later, or enter the steps yourself.",
  daily_cap: "Today's live runs are used up. Try again tomorrow, or enter the steps yourself.",
  busy: "The AI service is busy. Try again in a minute, or enter the steps yourself.",
  llm_failed: "We could not split this description automatically. Enter the steps yourself.",
};

const NARRATE_NOTICES: Partial<Record<NoticeCode, string>> = {
  live_disabled: "Live mode is off, so this summary was assembled from the results without AI writing.",
  rate_limited: "The live-run limit for this hour is reached, so this summary was assembled from the results without AI writing.",
  daily_cap: "Today's live runs are used up, so this summary was assembled from the results without AI writing.",
  busy: "The AI service is busy, so this summary was assembled from the results without AI writing.",
  llm_failed: "The AI-written summary did not pass our checks, so this one was assembled from the results.",
};

export interface HandlerDeps {
  config: LiveConfig;
  store: LiveStore | null;
  now: () => Date;
  decompose: typeof realDecompose;
  narrate: typeof realNarrate;
  log: (message: string) => void;
}

export function defaultDeps(): HandlerDeps {
  return {
    config: readLiveConfig(),
    store: upstashStore(),
    now: () => new Date(),
    decompose: realDecompose,
    narrate: realNarrate,
    log: (message) => console.warn(message),
  };
}

export const DecomposeBodySchema = z.object({ intake: IntakeInputSchema }).strict();
export const NarrateBodySchema = z
  .object({
    // Strict: a body that still carries `processDescription` is rejected, not silently stripped (ADR-0008).
    intake: IntakeStructuredSchema.strict(),
    decomposition: ConfirmedDecompositionSchema,
    caseToken: z.string().max(512).optional(),
  })
  .strict();

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** First hop of `x-forwarded-for` (set by Vercel), else `x-real-ip`. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: Response }> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return { ok: false, res: json({ ok: false, code: "too_large", message: "The request is too large." }, 413) };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return { ok: false, res: json({ ok: false, code: "too_large", message: "The request is too large." }, 413) };
    raw = JSON.parse(text);
  } catch {
    return { ok: false, res: json({ ok: false, code: "invalid", message: "Some fields are missing or invalid." }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Paths only: issue messages can echo input values.
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].slice(0, 10);
    return { ok: false, res: json({ ok: false, code: "invalid", message: "Some fields are missing or invalid.", fields }, 400) };
  }
  return { ok: true, data: parsed.data };
}

const utcDay = (d: Date) => d.toISOString().slice(0, 10);
const nowSeconds = (d: Date) => Math.floor(d.getTime() / 1000);

/** Maps a model failure to a notice; a spend limit also suspends live mode (SPEC §8). */
async function noticeForFailure(failure: LlmFailure, deps: HandlerDeps, route: string): Promise<{ code: NoticeCode; retryAfterSeconds?: number }> {
  deps.log(`[${route}] live call failed: ${failure.kind}${failure.detail ? ` (${failure.detail})` : ""}`);
  switch (failure.kind) {
    case "spend_limit":
      await deps.store?.suspend(SPEND_SUSPENSION_SECONDS);
      return { code: "live_disabled" };
    case "ramp_limited":
    case "rate_limited":
      return { code: "busy", retryAfterSeconds: failure.retryAfterSeconds ?? 60 };
    case "unavailable":
      return { code: "busy", retryAfterSeconds: 60 };
    default:
      return { code: "llm_failed" };
  }
}

type Gate = { ok: true; store: LiveStore } | { ok: false; code: NoticeCode; status: number; retryAfterSeconds?: number };

async function liveGate(deps: HandlerDeps): Promise<Gate> {
  if (!deps.config.liveEnabled || !deps.store) return { ok: false, code: "live_disabled", status: 503 };
  if (await deps.store.isSuspended()) return { ok: false, code: "live_disabled", status: 503 };
  return { ok: true, store: deps.store };
}

async function budgetGate(store: LiveStore, deps: HandlerDeps, ip: string, countsAsRun: boolean): Promise<Gate> {
  if (countsAsRun) {
    const r = await store.limitRun(ip);
    if (!r.ok) return { ok: false, code: "rate_limited", status: 429, retryAfterSeconds: r.retryAfterSeconds };
  }
  if (!(await store.countDaily(utcDay(deps.now()), deps.config.dailyCap))) return { ok: false, code: "daily_cap", status: 429 };
  return { ok: true, store };
}

function decomposeRefusal(code: NoticeCode, status: number, retryAfterSeconds?: number): Response {
  const headers: Record<string, string> = retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {};
  return json({ ok: false, code, message: NOTICES[code], fallback: "manual", ...(retryAfterSeconds ? { retryAfterSeconds } : {}) }, status, headers);
}

/** POST /api/decompose: one run (ADR-0008). Success returns the proposal plus a case token. */
export async function handleDecompose(req: Request, deps: HandlerDeps): Promise<Response> {
  const body = await readBody(req, DecomposeBodySchema);
  if (!body.ok) return body.res;

  const live = await liveGate(deps);
  if (!live.ok) return decomposeRefusal(live.code, live.status);
  const budget = await budgetGate(live.store, deps, clientIp(req), true);
  if (!budget.ok) return decomposeRefusal(budget.code, budget.status, budget.retryAfterSeconds);

  const result = await deps.decompose(body.data.intake);
  if (!result.ok) {
    const notice = await noticeForFailure(result.failure, deps, "api/decompose");
    const status = notice.code === "llm_failed" ? 502 : 503;
    return decomposeRefusal(notice.code, status, notice.retryAfterSeconds);
  }
  const token = await issueCaseToken(deps.config.tokenSecret!, nowSeconds(deps.now()));
  return json({
    ok: true,
    decomposition: result.decomposition,
    grounding: result.grounding,
    caseToken: token.token,
    caseTokenExpiresAt: new Date(token.exp * 1000).toISOString(),
  });
}

/**
 * POST /api/narrate: always answers 200 with a narrative. The server recomputes the engine from
 * the structured intake (no free text) and the confirmed decomposition; the client sends no results.
 */
export async function handleNarrate(req: Request, deps: HandlerDeps): Promise<Response> {
  const body = await readBody(req, NarrateBodySchema);
  if (!body.ok) return body.res;

  const { intake, decomposition, caseToken } = body.data;
  const result = computeCase(intakeFromStructured(intake), decomposition, { today: utcDay(deps.now()) });
  const facts = buildNarrationFacts(result, decomposition, intake.title);
  const triggered = result.triggeredRules.map((t) => t.ruleId);
  const template = (code: NoticeCode, tokenAccepted = false) =>
    json({ ok: true, source: "template", narrative: templateNarrative(facts), notice: { code, message: NARRATE_NOTICES[code] }, tokenAccepted });

  const live = await liveGate(deps);
  if (!live.ok) return template(live.code);

  let tokenAccepted = false;
  if (caseToken && deps.config.tokenSecret) {
    const v = await verifyCaseToken(caseToken, deps.config.tokenSecret, nowSeconds(deps.now()));
    // Reuse is rejected: a token pays for one narrate call only; after that it counts as a run.
    tokenAccepted = v.ok && (await live.store.consumeToken(v.jti, CASE_TOKEN_TTL_SECONDS));
  }
  const budget = await budgetGate(live.store, deps, clientIp(req), !tokenAccepted);
  if (!budget.ok) return template(budget.code, tokenAccepted);

  const out = await deps.narrate(facts, triggered);
  if (out.source === "llm") return json({ ok: true, source: "llm", narrative: out.narrative, tokenAccepted });
  const notice = await noticeForFailure(out.failure ?? { kind: "schema" }, deps, "api/narrate");
  return json({
    ok: true,
    source: "template",
    narrative: out.narrative,
    notice: { code: notice.code, message: NARRATE_NOTICES[notice.code] },
    tokenAccepted,
  });
}

/** GET /api/live-status: lets the intake decide whether to offer the live path or manual entry. */
export async function handleLiveStatus(deps: HandlerDeps): Promise<Response> {
  const live = await liveGate(deps);
  return json(live.ok ? { live: true } : { live: false, code: live.code, message: NOTICES[live.code] });
}
