/** Mock SDK helpers: unit tests never reach the network (`pnpm verify`). */
import Anthropic from "@anthropic-ai/sdk";
import { vi, type Mock } from "vitest";
import type { LlmClient } from "@/llm/client";

export interface MockClient extends LlmClient {
  parse: Mock;
}

export function mockClient(): MockClient {
  const parse = vi.fn();
  return { parse, messages: { parse } as unknown as LlmClient["messages"] };
}

export const USAGE = { input_tokens: 1200, output_tokens: 400, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 };

export function parsedResponse(parsed_output: unknown, stop_reason: string = "end_turn") {
  return { stop_reason, parsed_output, usage: USAGE, content: [] };
}

/** An APIError exactly as the SDK builds it from an HTTP response. */
export function apiError(status: number, opts: { errorCode?: string; retryAfter?: string; type?: string } = {}) {
  const headers = new Headers(opts.retryAfter ? { "retry-after": opts.retryAfter } : {});
  const body = {
    type: "error",
    error: {
      type: opts.type ?? (status === 429 ? "rate_limit_error" : "api_error"),
      message: "mock error",
      ...(opts.errorCode ? { details: { error_code: opts.errorCode } } : {}),
    },
  };
  return Anthropic.APIError.generate(status, body, undefined, headers);
}

export const noSleep = vi.fn(async () => {});
