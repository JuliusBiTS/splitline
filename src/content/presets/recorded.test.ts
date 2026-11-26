import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkNarrative } from "@/llm/guard";
import { computeCase } from "@/engine/index";
import { getPreset, PRESETS } from "./index";
import { applyConfirmationEdits, PresetRecordingSchema } from "./recorded";

const DIR = path.join(process.cwd(), "src", "content", "presets", "recorded");
const recordings = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => PresetRecordingSchema.parse(JSON.parse(readFileSync(path.join(DIR, f), "utf8"))))
  : [];

const base = PRESETS[0]!.decomposition;

describe("applyConfirmationEdits", () => {
  it("sets fields, removes and adds subtasks, then renumbers", () => {
    const out = applyConfirmationEdits(base, [
      { op: "set", subtaskId: "s1", field: "errorCost", value: "high", reason: "r" },
      { op: "remove", subtaskId: "s2", reason: "r" },
      { op: "add", afterSubtaskId: "s1", subtask: { ...base.subtasks[1]!, name: "Added" }, reason: "r" },
    ]);
    expect(out.subtasks.map((s) => s.id)).toEqual(base.subtasks.map((_, i) => `s${i + 1}`));
    expect(out.subtasks[0]!.errorCost).toBe("high");
    expect(out.subtasks[1]!.name).toBe("Added");
  });

  it("records an explicit no-consequential confirmation", () => {
    expect(applyConfirmationEdits(base, [{ op: "confirmNoConsequential", reason: "r" }]).confirmedNoConsequential).toBe(true);
  });

  it("fails on an unknown subtask", () => {
    expect(() => applyConfirmationEdits(base, [{ op: "remove", subtaskId: "s9", reason: "r" }])).toThrow();
  });
});

describe.each(recordings.map((r) => [r.slug, r] as const))("recording %s", (slug, r) => {
  const preset = getPreset(slug)!;

  it("belongs to a preset and records the model", () => {
    expect(preset).toBeDefined();
    expect(r.model).toBe("claude-sonnet-5-5");
  });

  it("the preset decomposition is the recorded proposal plus the listed confirmation edits", () => {
    expect(applyConfirmationEdits(r.decompose.decomposition, r.confirmationEdits)).toEqual(preset.decomposition);
  });

  it("the recorded narrative passes the guard for the confirmed case", () => {
    if (!r.narrate) return;
    const result = computeCase(preset.intake, preset.decomposition, { today: r.narrate.recordedAt });
    const names = [preset.intake.title, ...preset.decomposition.subtasks.map((s) => s.name)];
    expect(checkNarrative(r.narrate.narrative, result.triggeredRules.map((t) => t.ruleId), { userNames: names })).toEqual([]);
  });
});
