import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiError, mockClient, parsedResponse } from "../../tests/fixtures/llm";
import { classifyError, LlmCallError, MODEL_ID, parseStructured, withTransportRetry } from "./client";

describe("MODEL_ID", () => {
  it("is pinned to Sonnet 5.5 (SPEC §8)", () => {
    expect(MODEL_ID).toBe("claude-sonnet-5-5");
  });
});

describe("classifyError", () => {
  it("maps ramp_limit_exceeded by error code, with retry-after", () => {
    expect(classifyError(apiError(429, { errorCode: "ramp_limit_exceeded", retryAfter: "7" }))).toEqual({
      kind: "ramp_limited",
      retryAfterSeconds: 7,
      detail: "ramp_limit_exceeded",
    });
  });

  it("maps enforced_spend_limit_reached to spend_limit", () => {
    expect(classifyError(apiError(429, { errorCode: "enforced_spend_limit_reached" })).kind).toBe("spend_limit");
  });

  it("maps a plain 429 to rate_limited with retry-after", () => {
    expect(classifyError(apiError(429, { retryAfter: "4" }))).toMatchObject({ kind: "rate_limited", retryAfterSeconds: 4 });
  });

  it("maps 5xx and connection errors to unavailable, other 4xx to rejected", () => {
    expect(classifyError(apiError(529)).kind).toBe("unavailable");
    expect(classifyError(new Anthropic.APIConnectionError({ message: "x" })).kind).toBe("unavailable");
    expect(classifyError(apiError(401, { type: "authentication_error" })).kind).toBe("rejected");
  });

  it("treats non-API errors (parse failures) as schema failures", () => {
    expect(classifyError(new SyntaxError("bad json")).kind).toBe("schema");
  });
});

describe("withTransportRetry (SPEC §8)", () => {
  it("retries a 429 once when retry-after ≤ 10 s, waiting that long", async () => {
    const sleep = vi.fn(async () => {});
    const call = vi.fn().mockRejectedValueOnce(apiError(429, { retryAfter: "3" })).mockResolvedValueOnce("ok");
    await expect(withTransportRetry(call, sleep)).resolves.toBe("ok");
    expect(call).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("does not retry a 429 whose retry-after is over 10 s or missing", async () => {
    for (const retryAfter of ["30", undefined]) {
      const call = vi.fn().mockRejectedValue(apiError(429, { retryAfter }));
      await expect(withTransportRetry(call, async () => {})).rejects.toBeInstanceOf(LlmCallError);
      expect(call).toHaveBeenCalledTimes(1);
    }
  });

  it("never retries ramp or spend limits", async () => {
    for (const errorCode of ["ramp_limit_exceeded", "enforced_spend_limit_reached"]) {
      const call = vi.fn().mockRejectedValue(apiError(429, { errorCode, retryAfter: "1" }));
      const err = await withTransportRetry(call, async () => {}).catch((e: unknown) => e);
      expect(call).toHaveBeenCalledTimes(1);
      expect((err as LlmCallError).failure.kind).toBe(errorCode === "ramp_limit_exceeded" ? "ramp_limited" : "spend_limit");
    }
  });

  it("retries a transient 5xx once, then gives up", async () => {
    const call = vi.fn().mockRejectedValue(apiError(503));
    const err = await withTransportRetry(call, async () => {}).catch((e: unknown) => e);
    expect(call).toHaveBeenCalledTimes(2);
    expect((err as LlmCallError).failure.kind).toBe("unavailable");
  });
});

describe("parseStructured", () => {
  const schema = z.object({ answer: z.string() });

  it("sends the pinned model, a cache breakpoint on the last system block and structured output", async () => {
    const client = mockClient();
    client.parse.mockResolvedValue(parsedResponse({ answer: "x" }));
    const res = await parseStructured(client, { system: ["a", "b"], user: "u", schema, effort: "low", maxTokens: 100 });
    expect(res.output).toEqual({ answer: "x" });
    expect(res.usage.cacheReadInputTokens).toBe(1000);
    const params = client.parse.mock.calls[0]![0];
    expect(params.model).toBe("claude-sonnet-5-5");
    expect(params.system[0].cache_control).toBeUndefined();
    expect(params.system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format).toBeDefined();
  });

  it("throws refusal and schema failures as LlmCallError", async () => {
    const client = mockClient();
    client.parse.mockResolvedValueOnce(parsedResponse(null, "refusal"));
    await expect(parseStructured(client, { system: ["a"], user: "u", schema, effort: "low", maxTokens: 10 })).rejects.toMatchObject({
      failure: { kind: "refusal" },
    });
    client.parse.mockResolvedValueOnce(parsedResponse(null));
    await expect(parseStructured(client, { system: ["a"], user: "u", schema, effort: "low", maxTokens: 10 })).rejects.toMatchObject({
      failure: { kind: "schema" },
    });
  });
});
