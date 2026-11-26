/**
 * Live LLM eval (PLAN Phase 5): 6 sample intakes × 3 runs → schema-valid rate, required-field
 * completeness, decomposition stability and guard violations, plus cost and cache reads.
 * Costs money: it only runs with a key AND --confirm, after Julius approves the run.
 * Writes docs/evals/llm-YYYY-MM-DD.md. Metric definitions: scripts/eval-llm.lib.ts.
 *
 *   pnpm eval:llm -- --confirm [--runs 3]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { computeCase } from "../src/engine";
import type { Subtask } from "../src/engine/types";
import { MODEL_ID } from "../src/llm/client";
import { decompose } from "../src/llm/decompose";
import { buildNarrationFacts } from "../src/llm/narration-facts";
import { narrate } from "../src/llm/narrate";
import { AGREEMENT_THRESHOLD, countStable, isComplete, meanAgreement, pct } from "./eval-llm.lib";
import { EVAL_INTAKES } from "./eval-intakes";
import { argValue, estimateCostUsd, requirePaidRun, todayIso, type UsageLike } from "./llm-env";

requirePaidRun("eval:llm");

const RUNS = Number(argValue("--runs") ?? 3);

interface IntakeStats {
  id: string;
  decomposeOk: number;
  decomposeFirstTry: number;
  complete: number;
  counts: number[];
  runs: Subtask[][];
  failures: string[];
  narrateLlm: number;
  narrateFirstTry: number;
  firstAttemptViolations: string[];
  narrateSchemaValid: number;
  guardFallbacks: number;
  firstAttemptViolationCount: number;
  templateReasons: string[];
}

async function main(): Promise<void> {
  const today = todayIso();
  const usage: UsageLike[] = [];
  const stats: IntakeStats[] = [];
  let calls = 0;

  for (const e of EVAL_INTAKES) {
    const s: IntakeStats = {
      id: e.id,
      decomposeOk: 0,
      decomposeFirstTry: 0,
      complete: 0,
      counts: [],
      runs: [],
      failures: [],
      narrateLlm: 0,
      narrateFirstTry: 0,
      firstAttemptViolations: [],
      narrateSchemaValid: 0,
      guardFallbacks: 0,
      firstAttemptViolationCount: 0,
      templateReasons: [],
    };
    for (let run = 1; run <= RUNS; run++) {
      const d = await decompose(e.intake);
      calls += d.usage.length;
      usage.push(...d.usage);
      if (!d.ok) {
        s.failures.push(`${d.failure.kind}${d.problems.length ? `: ${d.problems.slice(0, 2).join("; ")}` : ""}`);
        console.log(`${e.id} run ${run}: decompose FAILED (${d.failure.kind})`);
      } else {
        s.decomposeOk++;
        if (d.attempts === 1) s.decomposeFirstTry++;
        if (isComplete(d.decomposition.subtasks, d.grounding.length)) s.complete++;
        s.counts.push(d.decomposition.subtasks.length);
        s.runs.push(d.decomposition.subtasks);
      }

      const confirmed = e.confirmed ?? (d.ok ? { ...d.decomposition, confirmedNoConsequential: true } : undefined);
      if (!confirmed) continue;
      const result = computeCase(e.intake, confirmed, { today });
      const n = await narrate(buildNarrationFacts(result, confirmed, e.intake.title), result.triggeredRules.map((t) => t.ruleId));
      calls += n.usage.length;
      usage.push(...n.usage);
      if (n.source === "llm") s.narrateLlm++;
      if (n.source === "llm" && n.attempts === 1) s.narrateFirstTry++;
      if (n.violations[0]?.length) s.firstAttemptViolations.push(...n.violations[0].map((v) => `${v.kind} "${v.match}"`));
      s.firstAttemptViolationCount += n.violations[0]?.length ?? 0;
      // Schema-valid: the last attempt parsed into NarrativeSchema (a guard rejection still counts as schema-valid).
      if (n.source === "llm" || n.failure?.kind === "guard") s.narrateSchemaValid++;
      // Guard violation that survived the retry, i.e. the narrative had to fall back to the template.
      if (n.failure?.kind === "guard") s.guardFallbacks++;
      if (n.failure) s.templateReasons.push(`${n.failure.kind}${n.failure.detail ? ` (${n.failure.detail})` : ""}`);
      console.log(`${e.id} run ${run}: decompose ${d.ok ? `${d.decomposition.subtasks.length} subtasks/${d.attempts} try` : "failed"}; narrate ${n.source}/${n.attempts} try`);
    }
    stats.push(s);
  }

  const totalRuns = EVAL_INTAKES.length * RUNS;
  const sum = (f: (s: IntakeStats) => number) => stats.reduce((a, s) => a + f(s), 0);
  const narrations = sum((s) => s.narrateLlm + s.templateReasons.length);
  const agreements = stats.map((s) => meanAgreement(s.runs));
  const stable = stats.filter((s, i) => s.runs.length === RUNS && countStable(s.counts) && agreements[i]! >= AGREEMENT_THRESHOLD).length;
  const countStableN = stats.filter((s) => s.runs.length === RUNS && countStable(s.counts)).length;
  const meanAgree = agreements.reduce((a, x) => a + x, 0) / agreements.length;
  const cacheRead = usage.reduce((a, u) => a + u.cacheReadInputTokens, 0);
  const cacheWrite = usage.reduce((a, u) => a + u.cacheCreationInputTokens, 0);
  const inputTokens = usage.reduce((a, u) => a + u.inputTokens, 0);

  const lines = [
    `# LLM eval, ${today}`,
    "",
    `Model \`${MODEL_ID}\` · ${EVAL_INTAKES.length} intakes × ${RUNS} runs · ${calls} API calls · estimated cost $${estimateCostUsd(usage).toFixed(3)} (list prices).`,
    "Generated by `pnpm eval:llm -- --confirm` (scripts/eval-llm.ts). Metric definitions are in `scripts/eval-llm.lib.ts`.",
    "",
    "## Acceptance (PLAN Phase 5)",
    "",
    "| Check | Target | Result |",
    "|---|---|---|",
    `| Decomposition schema-valid (within the one retry) | 100% | ${pct(sum((s) => s.decomposeOk), totalRuns)} |`,
    `| Narration schema-valid (within the one retry) | 100% | ${pct(sum((s) => s.narrateSchemaValid), narrations)} |`,
    `| Guard violations after the retry (narration fell back to the template because of the guard) | 0 | ${sum((s) => s.guardFallbacks)} |`,
    `| Stability (count ±1 and attribute agreement ≥ ${AGREEMENT_THRESHOLD * 100}%) | ≥ 80% of intakes | ${pct(stable, stats.length)} |`,
    "",
    "## Detail",
    "",
    `- Decomposition valid on the first attempt: ${pct(sum((s) => s.decomposeFirstTry), totalRuns)}.`,
    `- Required-field completeness (text fields and grounded quotes): ${pct(sum((s) => s.complete), totalRuns)}.`,
    `- Count stability: ${pct(countStableN, stats.length)} of intakes; mean attribute agreement ${(meanAgree * 100).toFixed(0)}%.`,
    `- Guard findings on first attempts (fixed by the retry or ending in the template): ${sum((s) => s.firstAttemptViolationCount)}; LLM text shipped: ${pct(sum((s) => s.narrateLlm), narrations)}.`,
    `- Narration guard-clean on the first attempt: ${pct(sum((s) => s.narrateFirstTry), narrations)}; template fallbacks: ${sum((s) => s.templateReasons.length)}.`,
    `- Prompt cache: ${cacheRead} cache-read and ${cacheWrite} cache-write input tokens vs ${inputTokens} uncached input tokens.`,
    "",
    "| Intake | Decompose ok | Subtask counts | Agreement | Narration LLM / runs | First-attempt guard findings | Failures / fallbacks |",
    "|---|---|---|---|---|---|---|",
    ...stats.map(
      (s, i) =>
        `| ${s.id} | ${s.decomposeOk}/${RUNS} | ${s.counts.join(", ") || "–"} | ${(agreements[i]! * 100).toFixed(0)}% | ${s.narrateLlm}/${s.narrateLlm + s.templateReasons.length} | ${s.firstAttemptViolations.join("; ") || "none"} | ${[...s.failures, ...s.templateReasons].join("; ") || "none"} |`,
    ),
    "",
  ];
  const dir = path.join("docs", "evals");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `llm-${today}.md`);
  writeFileSync(file, lines.join("\n"));
  console.log(`\nReport written to ${file}`);
  console.log(lines.slice(6, 13).join("\n"));
}

void main();
