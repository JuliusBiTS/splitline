import { describe, expect, it, vi } from "vitest";
import { getPreset } from "@/content/presets";
import { computeCase } from "@/engine/index";
import type { Narrative } from "@/engine/types";
import { apiError, mockClient, parsedResponse } from "../../tests/fixtures/llm";
import { buildNarrationFacts } from "./narration-facts";
import { buildNarrateUserMessage, narrate } from "./narrate";
import { templateNarrative } from "./narrate-template";

const preset = getPreset("contract-clause-review")!;
const result = computeCase(preset.intake, preset.decomposition, { today: "2026-11-20" });
const facts = buildNarrationFacts(result, preset.decomposition, preset.intake.title);
const triggered = result.triggeredRules.map((t) => t.ruleId);
const sleep = vi.fn(async () => {});

const good: Narrative = {
  executiveSummary: "Go with conditions at AIA-inspired indicative tier II. This likely triggers BC PIPA consent duties; prepare for proposed Bill C-36.",
  splitNarrative: "The AI drafts clause flags and a person checks and signs off. This is a starting split.",
  leverNarratives: ["Set up local decisions. Keep the guardrail. Direct cost: some efficiency.", "Adjust weekly.", "Pair experts with the AI team."],
  rolloutNarrative: "Days 1–30 foundation, 31–60 shadow pilot, 61–90 controlled scale.",
};

describe("narration facts", () => {
  it("use plain labels and never contain rule IDs, step IDs or the free-text description", () => {
    const json = JSON.stringify(facts);
    expect(json).not.toMatch(/\b(?:BC|FED|ON|QC)-[A-Z0-9]+/);
    expect(json).not.toContain(preset.intake.processDescription.slice(0, 40));
    expect(facts.tier.label).toBe("AIA-inspired indicative tier");
    expect(facts.levers.every((l) => l.guardrail && l.directCost)).toBe(true);
  });

  it("are sent inside an engine_facts block", () => {
    expect(buildNarrateUserMessage(facts)).toMatch(/^<engine_facts>\n\{/);
  });
});

describe("narrate (mocked SDK)", () => {
  it("success: guarded LLM text", async () => {
    const client = mockClient();
    client.parse.mockResolvedValue(parsedResponse(good));
    const r = await narrate(facts, triggered, { client, sleep });
    expect(r).toMatchObject({ source: "llm", attempts: 1, narrative: good });
  });

  it("guard violation → retry with the problems → success", async () => {
    const client = mockClient();
    const bad = { ...good, executiveSummary: "You must file under PIPEDA and BC FIPPA." };
    client.parse.mockResolvedValueOnce(parsedResponse(bad)).mockResolvedValueOnce(parsedResponse(good));
    const r = await narrate(facts, triggered, { client, sleep });
    expect(r.source).toBe("llm");
    expect(r.attempts).toBe(2);
    expect(r.violations[0]!.length).toBeGreaterThan(0);
    expect(client.parse.mock.calls[1]![0].messages[0].content).toContain("<previous_attempt_problems>");
  });

  it("guard violation twice → template fallback", async () => {
    const client = mockClient();
    client.parse.mockResolvedValue(parsedResponse({ ...good, splitNarrative: "Step s2 is compliant." }));
    const r = await narrate(facts, triggered, { client, sleep });
    expect(r).toMatchObject({ source: "template", failure: { kind: "guard" } });
    expect(r.narrative).toEqual(templateNarrative(facts));
  });

  it("schema failure (two levers) → retry → template fallback", async () => {
    const client = mockClient();
    client.parse.mockResolvedValue(parsedResponse({ ...good, leverNarratives: ["a", "b"] }));
    const r = await narrate(facts, triggered, { client, sleep });
    expect(r).toMatchObject({ source: "template", attempts: 2, failure: { kind: "schema" } });
  });

  it("429 with retry-after → one retry → success", async () => {
    const client = mockClient();
    client.parse.mockRejectedValueOnce(apiError(429, { retryAfter: "1" })).mockResolvedValueOnce(parsedResponse(good));
    const r = await narrate(facts, triggered, { client, sleep });
    expect(r.source).toBe("llm");
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("ramp_limit_exceeded and enforced_spend_limit_reached → template at once, failure reported", async () => {
    for (const [errorCode, kind] of [
      ["ramp_limit_exceeded", "ramp_limited"],
      ["enforced_spend_limit_reached", "spend_limit"],
    ] as const) {
      const client = mockClient();
      client.parse.mockRejectedValue(apiError(429, { errorCode }));
      const r = await narrate(facts, triggered, { client, sleep });
      expect(r).toMatchObject({ source: "template", attempts: 1, failure: { kind } });
      expect(client.parse).toHaveBeenCalledTimes(1);
    }
  });
});
