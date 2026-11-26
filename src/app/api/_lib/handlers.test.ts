import { describe, expect, it, vi } from "vitest";
import { getPreset } from "@/content/presets";
import { toStructured } from "@/engine/structured-intake";
import type { DecomposeResult } from "@/llm/decompose";
import type { NarrateResult } from "@/llm/narrate";
import { readLiveConfig } from "./config";
import { handleDecompose, handleLiveStatus, handleNarrate, type HandlerDeps } from "./handlers";
import { memoryStore, RUNS_PER_IP_PER_HOUR } from "./store";

const preset = getPreset("claims-document-intake")!;
const SECRET = "x".repeat(40);
const ENV_ON = { LIVE_MODE_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test", CASE_TOKEN_SECRET: SECRET, DAILY_LIVE_RUN_CAP: "100" };

const okDecompose: DecomposeResult = {
  ok: true,
  decomposition: preset.decomposition,
  grounding: [],
  attempts: 1,
  usage: [],
};

function deps(over: Partial<HandlerDeps> = {}, env: Record<string, string> = ENV_ON): HandlerDeps & { logs: string[] } {
  const logs: string[] = [];
  return {
    config: readLiveConfig(env),
    store: memoryStore(() => 1_700_000_000_000),
    now: () => new Date("2026-11-26T12:00:00Z"),
    decompose: vi.fn(async () => okDecompose),
    narrate: vi.fn(async (): Promise<NarrateResult> => ({
      narrative: {
        executiveSummary: "LLM summary.",
        splitNarrative: "Split.",
        leverNarratives: ["a", "b", "c"],
        rolloutNarrative: "Rollout.",
      },
      source: "llm",
      attempts: 1,
      usage: [],
      violations: [[]],
    })),
    log: (m) => logs.push(m),
    logs,
    ...over,
  };
}

const post = (body: unknown, ip = "203.0.113.7") =>
  new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: JSON.stringify(body),
  });

const decomposeBody = { intake: preset.intake };
const narrateBody = (caseToken?: string) => ({
  intake: toStructured(preset.intake),
  decomposition: preset.decomposition,
  ...(caseToken ? { caseToken } : {}),
});

describe("config", () => {
  it("needs the switch, the key and a long enough token secret", () => {
    expect(readLiveConfig(ENV_ON).liveEnabled).toBe(true);
    expect(readLiveConfig({ ...ENV_ON, LIVE_MODE_ENABLED: "false" }).liveEnabled).toBe(false);
    expect(readLiveConfig({ ...ENV_ON, ANTHROPIC_API_KEY: "" }).liveEnabled).toBe(false);
    expect(readLiveConfig({ ...ENV_ON, CASE_TOKEN_SECRET: "short" }).liveEnabled).toBe(false);
    expect(readLiveConfig({}).dailyCap).toBe(100);
  });
});

describe("POST /api/decompose", () => {
  it("rejects invalid and unexpected payloads with 400 and field paths only", async () => {
    const d = deps();
    const res = await handleDecompose(post({ intake: { ...preset.intake, processDescription: "too short" }, extra: 1 }), d);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("invalid");
    expect(JSON.stringify(body)).not.toContain("too short");
    expect(d.decompose).not.toHaveBeenCalled();
  });

  it("LIVE_MODE_ENABLED=false → 503 live_disabled with the manual fallback, no model call", async () => {
    const d = deps({}, { ...ENV_ON, LIVE_MODE_ENABLED: "false" });
    const res = await handleDecompose(post(decomposeBody), d);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, code: "live_disabled", fallback: "manual" });
    expect(d.decompose).not.toHaveBeenCalled();
  });

  it("without Upstash configured, live mode stays off", async () => {
    const res = await handleDecompose(post(decomposeBody), deps({ store: null }));
    expect((await res.json()).code).toBe("live_disabled");
  });

  it("success returns the proposal and a case token, with no-store", async () => {
    const res = await handleDecompose(post(decomposeBody), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.caseToken).toMatch(/^[\w-]+\.[\w-]+$/);
  });

  it(`allows ${RUNS_PER_IP_PER_HOUR} runs per IP per hour, then 429 with Retry-After`, async () => {
    const d = deps();
    for (let i = 0; i < RUNS_PER_IP_PER_HOUR; i++) expect((await handleDecompose(post(decomposeBody), d)).status).toBe(200);
    const res = await handleDecompose(post(decomposeBody), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect((await res.json()).code).toBe("rate_limited");
    // Another IP is unaffected.
    expect((await handleDecompose(post(decomposeBody, "198.51.100.1"), d)).status).toBe(200);
  });

  it("enforces the global daily cap across IPs", async () => {
    const d = deps({}, { ...ENV_ON, DAILY_LIVE_RUN_CAP: "2" });
    expect((await handleDecompose(post(decomposeBody, "1.1.1.1"), d)).status).toBe(200);
    expect((await handleDecompose(post(decomposeBody, "2.2.2.2"), d)).status).toBe(200);
    const res = await handleDecompose(post(decomposeBody, "3.3.3.3"), d);
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("daily_cap");
  });

  it("enforced_spend_limit_reached → live mode suspended; the next request is refused without a model call", async () => {
    const d = deps({ decompose: vi.fn(async (): Promise<DecomposeResult> => ({ ok: false, failure: { kind: "spend_limit" }, attempts: 1, usage: [], problems: [] })) });
    const res = await handleDecompose(post(decomposeBody), d);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "live_disabled", message: expect.stringContaining("Live mode is off") });
    await handleDecompose(post(decomposeBody), d);
    expect(d.decompose).toHaveBeenCalledTimes(1);
    expect(await (await handleLiveStatus(d)).json()).toMatchObject({ live: false });
  });

  it("ramp limit → 503 busy with Retry-After; schema failure → 502 manual fallback", async () => {
    const ramp = deps({ decompose: vi.fn(async (): Promise<DecomposeResult> => ({ ok: false, failure: { kind: "ramp_limited", retryAfterSeconds: 30 }, attempts: 1, usage: [], problems: [] })) });
    const r1 = await handleDecompose(post(decomposeBody), ramp);
    expect(r1.status).toBe(503);
    expect(r1.headers.get("retry-after")).toBe("30");
    expect((await r1.json()).code).toBe("busy");
    const schema = deps({ decompose: vi.fn(async (): Promise<DecomposeResult> => ({ ok: false, failure: { kind: "schema" }, attempts: 2, usage: [], problems: ["x"] })) });
    const r2 = await handleDecompose(post(decomposeBody), schema);
    expect(r2.status).toBe(502);
    expect(await r2.json()).toMatchObject({ code: "llm_failed", fallback: "manual" });
  });

  it("never logs the request body", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const d = deps({ decompose: vi.fn(async (): Promise<DecomposeResult> => ({ ok: false, failure: { kind: "schema" }, attempts: 2, usage: [], problems: [] })) });
    await handleDecompose(post(decomposeBody), d);
    const logged = [...d.logs, ...spies.flatMap((s) => s.mock.calls.flat().map(String))].join("\n");
    expect(logged).not.toContain(preset.intake.processDescription.slice(0, 30));
    expect(logged).not.toContain(preset.intake.title);
    spies.forEach((s) => s.mockRestore());
  });
});

describe("POST /api/narrate", () => {
  it("always answers with a narrative: template when live mode is off", async () => {
    const d = deps({}, { ...ENV_ON, LIVE_MODE_ENABLED: "false" });
    const res = await handleNarrate(post(narrateBody()), d);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, source: "template", notice: { code: "live_disabled" } });
    expect(body.narrative.leverNarratives).toHaveLength(3);
    expect(d.narrate).not.toHaveBeenCalled();
  });

  it("rejects a body that carries the free-text description (structured data only)", async () => {
    const res = await handleNarrate(post({ ...narrateBody(), intake: preset.intake }), deps());
    expect(res.status).toBe(400);
  });

  it("a valid case token pays for one narrate call; reuse is rejected and counts as a run", async () => {
    const d = deps();
    const token = (await (await handleDecompose(post(decomposeBody), d)).json()).caseToken as string;
    const first = await (await handleNarrate(post(narrateBody(token)), d)).json();
    expect(first).toMatchObject({ source: "llm", tokenAccepted: true });
    const again = await (await handleNarrate(post(narrateBody(token)), d)).json();
    expect(again.tokenAccepted).toBe(false);
  });

  it("without a token, narrate counts as a run against the IP limit", async () => {
    const d = deps();
    for (let i = 0; i < RUNS_PER_IP_PER_HOUR; i++) await handleNarrate(post(narrateBody()), d);
    const body = await (await handleNarrate(post(narrateBody()), d)).json();
    expect(body).toMatchObject({ source: "template", notice: { code: "rate_limited" } });
  });

  it("a forged token is not accepted", async () => {
    const body = await (await handleNarrate(post(narrateBody("abc.def")), deps())).json();
    expect(body.tokenAccepted).toBe(false);
  });

  it("spend limit during narration → template and live mode suspended", async () => {
    const d = deps({
      narrate: vi.fn(async (): Promise<NarrateResult> => ({
        narrative: { executiveSummary: "t", splitNarrative: "t", leverNarratives: ["a", "b", "c"], rolloutNarrative: "t" },
        source: "template",
        attempts: 1,
        usage: [],
        violations: [],
        failure: { kind: "spend_limit" },
      })),
    });
    const body = await (await handleNarrate(post(narrateBody()), d)).json();
    expect(body).toMatchObject({ source: "template", notice: { code: "live_disabled" } });
    expect(await d.store!.isSuspended()).toBe(true);
  });
});

describe("GET /api/live-status", () => {
  it("reports live mode", async () => {
    expect(await (await handleLiveStatus(deps())).json()).toEqual({ live: true });
    expect(await (await handleLiveStatus(deps({}, {}))).json()).toMatchObject({ live: false, code: "live_disabled" });
  });
});
