/**
 * The only place that talks to the Claude API (CLAUDE.md, SPEC §8). Server-only: imported by
 * `src/app/api/*` and the paid scripts, never by components (enforced by `boundary.test.ts`).
 *
 * The LLM never decides tiers, rules, verdicts, owners or scores (ADR-0001). It returns
 * schema-checked text that the callers validate again locally.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/** Pinned model (SPEC §8). Change it here only. */
export const MODEL_ID = "claude-sonnet-5-5";

/** Keep live routes well under the Vercel function limit (CLAUDE.md gotchas). */
export const REQUEST_TIMEOUT_MS = 45_000;

/** SPEC §8: a 429 with `retry-after` gets one retry only when the wait is at most this long. */
export const MAX_RETRY_AFTER_SECONDS = 10;

/** Pause before the single retry of a transient 5xx / connection failure. */
export const TRANSIENT_RETRY_DELAY_MS = 1_000;

/** The slice of the SDK this layer uses, so unit tests can pass a mock (no network in `pnpm verify`). */
export interface LlmClient {
  messages: Pick<Anthropic["messages"], "parse">;
}

let sharedClient: Anthropic | null = null;

/** The real client. SDK retries are off: the retry rules of SPEC §8 are applied once, in `withTransportRetry`. */
export function getClient(): LlmClient {
  sharedClient ??= new Anthropic({ maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });
  return sharedClient;
}

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Failure mapping
// ---------------------------------------------------------------------------

export type LlmFailureKind =
  /** 429 from the API (requests or tokens per minute). */
  | "rate_limited"
  /** 429 `ramp_limit_exceeded`: usage grew too fast; back off, no retry. */
  | "ramp_limited"
  /** 429 `enforced_spend_limit_reached` (or a contract spend limit): no retry; live mode goes off. */
  | "spend_limit"
  /** The output did not parse or failed the local schema / grounding checks. */
  | "schema"
  /** `stop_reason: "refusal"`. */
  | "refusal"
  /** The narration named something outside the engine facts (narration only). */
  | "guard"
  /** 5xx, overload, timeout or connection error. */
  | "unavailable"
  /** 4xx the caller cannot fix by retrying (bad key, bad request). */
  | "rejected";

export interface LlmFailure {
  kind: LlmFailureKind;
  retryAfterSeconds?: number;
  /** Short machine-readable detail for logs and evals. Never contains user text. */
  detail?: string;
}

export class LlmCallError extends Error {
  constructor(readonly failure: LlmFailure) {
    super(`LLM call failed: ${failure.kind}${failure.detail ? ` (${failure.detail})` : ""}`);
    this.name = "LlmCallError";
  }
}

function retryAfterSeconds(headers: Headers | undefined): number | undefined {
  const raw = headers?.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/** Maps any thrown value to a failure kind. Branches on `errorCode` and status, never on message text. */
export function classifyError(err: unknown): LlmFailure {
  if (err instanceof LlmCallError) return err.failure;
  if (err instanceof Anthropic.APIConnectionError) return { kind: "unavailable", detail: "connection" };
  if (err instanceof Anthropic.APIError) {
    const code = err.errorCode;
    if (code === "enforced_spend_limit_reached" || code === "contract_spend_limit_reached") {
      return { kind: "spend_limit", detail: code };
    }
    if (code === "ramp_limit_exceeded") {
      return { kind: "ramp_limited", retryAfterSeconds: retryAfterSeconds(err.headers), detail: code };
    }
    const status = err.status ?? 0;
    if (status === 429) return { kind: "rate_limited", retryAfterSeconds: retryAfterSeconds(err.headers), detail: "429" };
    if (status === 408 || status >= 500) return { kind: "unavailable", detail: String(status) };
    return { kind: "rejected", detail: String(status) };
  }
  // Anything else came from parsing the model output (JSON or Zod).
  return { kind: "schema", detail: err instanceof Error ? err.name : "unknown" };
}

/**
 * Transport resilience (SPEC §8): one retry for a 429 whose `retry-after` is ≤ 10 s and one for a
 * transient 5xx / connection error. Ramp and spend limits are never retried.
 */
export async function withTransportRetry<T>(call: () => Promise<T>, sleep: Sleep = realSleep): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const failure = classifyError(err);
    let waitMs: number | null = null;
    if (
      failure.kind === "rate_limited" &&
      failure.retryAfterSeconds !== undefined &&
      failure.retryAfterSeconds <= MAX_RETRY_AFTER_SECONDS
    ) {
      waitMs = failure.retryAfterSeconds * 1000;
    } else if (failure.kind === "unavailable") {
      waitMs = TRANSIENT_RETRY_DELAY_MS;
    }
    if (waitMs === null) throw new LlmCallError(failure);
    await sleep(waitMs);
    try {
      return await call();
    } catch (retryErr) {
      throw new LlmCallError(classifyError(retryErr));
    }
  }
}

// ---------------------------------------------------------------------------
// Structured call
// ---------------------------------------------------------------------------

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface StructuredRequest<S extends z.ZodType> {
  /** Stable system text (prompt file, then rule context). The last block carries the cache breakpoint. */
  system: readonly string[];
  /** Volatile user content (delimited data blocks). */
  user: string;
  schema: S;
  effort: "low" | "medium" | "high";
  maxTokens: number;
}

/** One `messages.parse()` call with `zodOutputFormat()`. Throws `LlmCallError` on refusal or unparsable output. */
export async function parseStructured<S extends z.ZodType>(
  client: LlmClient,
  req: StructuredRequest<S>,
): Promise<{ output: z.infer<S>; usage: LlmUsage }> {
  const system = req.system.map((text, i) =>
    i === req.system.length - 1
      ? { type: "text" as const, text, cache_control: { type: "ephemeral" as const } }
      : { type: "text" as const, text },
  );
  const res = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: req.maxTokens,
    system,
    messages: [{ role: "user", content: req.user }],
    output_config: { effort: req.effort, format: zodOutputFormat(req.schema) },
  });
  if (res.stop_reason === "refusal") throw new LlmCallError({ kind: "refusal", detail: "refusal" });
  if (res.stop_reason === "max_tokens") throw new LlmCallError({ kind: "schema", detail: "max_tokens" });
  if (res.parsed_output === null || res.parsed_output === undefined) {
    throw new LlmCallError({ kind: "schema", detail: "no_parsed_output" });
  }
  return {
    output: res.parsed_output as z.infer<S>,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheReadInputTokens: res.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
