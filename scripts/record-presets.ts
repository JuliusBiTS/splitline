/**
 * Records live LLM runs for the 4 presets (PLAN Phase 5, ADR-0019 option (a)). Three steps:
 *
 *   pnpm tsx scripts/record-presets.ts --step decompose --confirm [--slug <slug>]   (paid)
 *     Decomposes each preset description; writes src/content/presets/recorded/<slug>.json with the
 *     raw proposal, model ID and date. Keeps existing confirmation edits only if --keep-edits.
 *   (A reviewer then writes `confirmationEdits` in the recording: what a user changes in step 3.)
 *   pnpm tsx scripts/record-presets.ts --step apply [--slug <slug>]                 (free)
 *     Applies the edits and writes the confirmed decomposition into the preset JSON.
 *   pnpm tsx scripts/record-presets.ts --step narrate --confirm [--slug <slug>]     (paid)
 *     Narrates the confirmed preset (guarded) and stores the narrative in the recording.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PRESETS } from "@/content/presets";
import { applyConfirmationEdits, PresetRecordingSchema, type PresetRecording } from "@/content/presets/recorded";
import { computeCase } from "@/engine/index";
import { IntakeInputSchema } from "@/engine/types";
import { MODEL_ID } from "@/llm/client";
import { decompose } from "@/llm/decompose";
import { buildNarrationFacts } from "@/llm/narration-facts";
import { narrate } from "@/llm/narrate";
import { argValue, estimateCostUsd, requirePaidRun, todayIso, type UsageLike } from "./llm-env";

const PRESET_DIR = path.join("src", "content", "presets");
const RECORDED_DIR = path.join(PRESET_DIR, "recorded");
const step = argValue("--step");
const only = argValue("--slug");
const presets = PRESETS.filter((p) => !only || p.slug === only);

const recordingPath = (slug: string) => path.join(RECORDED_DIR, `${slug}.json`);
const readRecording = (slug: string): PresetRecording | null =>
  existsSync(recordingPath(slug)) ? PresetRecordingSchema.parse(JSON.parse(readFileSync(recordingPath(slug), "utf8"))) : null;
const writeJson = (file: string, data: unknown) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

async function recordDecompositions(): Promise<void> {
  requirePaidRun("record-presets --step decompose");
  mkdirSync(RECORDED_DIR, { recursive: true });
  const usage: UsageLike[] = [];
  for (const p of presets) {
    const intake = IntakeInputSchema.parse(p.intake);
    const r = await decompose(intake);
    usage.push(...r.usage);
    if (!r.ok) {
      console.error(`${p.slug}: decomposition failed (${r.failure.kind}). Problems: ${r.problems.join(" | ")}`);
      process.exitCode = 1;
      continue;
    }
    const previous = readRecording(p.slug);
    const recording: PresetRecording = {
      slug: p.slug,
      model: MODEL_ID,
      decompose: { recordedAt: todayIso(), attempts: r.attempts, decomposition: r.decomposition, grounding: r.grounding },
      confirmationEdits: process.argv.includes("--keep-edits") ? (previous?.confirmationEdits ?? []) : [],
    };
    writeJson(recordingPath(p.slug), recording);
    console.log(`${p.slug}: ${r.decomposition.subtasks.length} subtasks in ${r.attempts} attempt(s) → ${recordingPath(p.slug)}`);
  }
  console.log(`Estimated cost: $${estimateCostUsd(usage).toFixed(3)}`);
}

function applyEdits(): void {
  for (const p of presets) {
    const rec = readRecording(p.slug);
    if (!rec) {
      console.error(`${p.slug}: no recording yet; run --step decompose first.`);
      process.exitCode = 1;
      continue;
    }
    const confirmed = applyConfirmationEdits(rec.decompose.decomposition, rec.confirmationEdits);
    const file = path.join(PRESET_DIR, `${p.slug}.json`);
    const json = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    json.decomposition = confirmed;
    writeJson(file, json);
    const r = computeCase(p.intake, confirmed, { today: todayIso() });
    console.log(`${p.slug}: ${rec.confirmationEdits.length} edit(s) → tier ${r.tier.level}, ${r.verdict.label}`);
  }
}

async function recordNarratives(): Promise<void> {
  requirePaidRun("record-presets --step narrate");
  const usage: UsageLike[] = [];
  for (const p of presets) {
    const rec = readRecording(p.slug);
    if (!rec) {
      console.error(`${p.slug}: no recording yet; run --step decompose first.`);
      process.exitCode = 1;
      continue;
    }
    const today = todayIso();
    const result = computeCase(p.intake, p.decomposition, { today });
    const facts = buildNarrationFacts(result, p.decomposition, p.intake.title);
    const out = await narrate(facts, result.triggeredRules.map((t) => t.ruleId));
    usage.push(...out.usage);
    if (out.source !== "llm") {
      // A template fallback is not a recording of the model: fail and keep the previous file.
      console.error(`${p.slug}: narration fell back to the template (${out.failure?.kind ?? "unknown"}); not recorded.`);
      process.exitCode = 1;
      continue;
    }
    rec.narrate = {
      recordedAt: today,
      attempts: out.attempts,
      source: out.source,
      narrative: out.narrative,
      engineVersion: result.engineVersion,
      ruleCatalogueVersion: result.ruleCatalogueVersion,
    };
    writeJson(recordingPath(p.slug), rec);
    const v = out.violations.map((x) => x.length).join("/");
    console.log(`${p.slug}: ${out.source} in ${out.attempts} attempt(s); guard violations per attempt: ${v || "none"}${out.failure ? `; fallback reason ${out.failure.kind}` : ""}`);
  }
  console.log(`Estimated cost: $${estimateCostUsd(usage).toFixed(3)}`);
}

async function main(): Promise<void> {
  if (step === "decompose") return recordDecompositions();
  if (step === "apply") return applyEdits();
  if (step === "narrate") return recordNarratives();
  console.log("Usage: record-presets.ts --step decompose|apply|narrate [--confirm] [--slug <slug>] [--keep-edits]");
}

void main();
