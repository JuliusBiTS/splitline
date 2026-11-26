/**
 * Shared guard for the paid scripts (record-presets, eval-llm). They call the real Claude API and
 * cost money: they run only with `--confirm` and a key, after Julius approves the run.
 * The key comes from `.env.local` (never committed) or the environment; `--env <path>` points elsewhere.
 */
import { existsSync } from "node:fs";

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function requirePaidRun(scriptName: string): void {
  const envPath = argValue("--env") ?? ".env.local";
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  const confirmed = process.argv.includes("--confirm");
  if (!confirmed || !process.env.ANTHROPIC_API_KEY) {
    console.log(
      `${scriptName} calls the real Claude API and costs money. Run it with --confirm and ANTHROPIC_API_KEY set ` +
        `(in .env.local or via --env <path>), after approval.`,
    );
    process.exit(0);
  }
}

/** Sonnet 5.5 list prices per million tokens (claude-api skill, cached 2026-11-03). Estimates only. */
export const PRICE_PER_MTOK = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

export interface UsageLike {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export function estimateCostUsd(usage: readonly UsageLike[]): number {
  return usage.reduce(
    (sum, u) =>
      sum +
      (u.inputTokens * PRICE_PER_MTOK.input +
        u.outputTokens * PRICE_PER_MTOK.output +
        u.cacheReadInputTokens * PRICE_PER_MTOK.cacheRead +
        u.cacheCreationInputTokens * PRICE_PER_MTOK.cacheWrite) /
        1_000_000,
    0,
  );
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
