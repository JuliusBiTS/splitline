/**
 * Lighthouse performance check (PLAN Phase 4, SPEC §12): performance ≥ 90 on `/` and one preset.
 * Serves the production build (`pnpm build` first) and audits it with Playwright's Chromium using
 * Lighthouse's default mobile emulation and throttling. Writes a summary to docs/evidence/phase-4/.
 *
 * Usage: pnpm build && pnpm test:lighthouse (plain Node type stripping: tsx would inject helpers
 * into the functions Lighthouse runs in the page)
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const PORT = 3200;
const DEBUG_PORT = 9333;
const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/", "/preset/clinical-referral-triage"];
const MIN_SCORE = 90;
const RUNS = 3; // median of 3 smooths local noise

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start`);
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function main() {
  const server = spawn(`pnpm start --port ${PORT}`, { shell: true, stdio: "ignore", env: { ...process.env, LIVE_MODE_ENABLED: "false" } });
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
  const results: { route: string; scores: number[]; median: number; lcpMs: number; tbtMs: number; cls: number }[] = [];
  try {
    await waitForServer(BASE);
    for (const route of ROUTES) {
      const scores: number[] = [];
      let last: { lcp: number; tbt: number; cls: number } = { lcp: 0, tbt: 0, cls: 0 };
      for (let i = 0; i < RUNS; i++) {
        const run = await lighthouse(`${BASE}${route}`, { port: DEBUG_PORT, onlyCategories: ["performance"], output: "json", logLevel: "error" });
        const lhr = run?.lhr;
        if (!lhr) throw new Error(`No Lighthouse result for ${route}`);
        scores.push(Math.round((lhr.categories.performance?.score ?? 0) * 100));
        last = {
          lcp: lhr.audits["largest-contentful-paint"]?.numericValue ?? 0,
          tbt: lhr.audits["total-blocking-time"]?.numericValue ?? 0,
          cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? 0,
        };
      }
      results.push({ route, scores, median: median(scores), lcpMs: Math.round(last.lcp), tbtMs: Math.round(last.tbt), cls: Math.round(last.cls * 1000) / 1000 });
    }
  } finally {
    await browser.close();
    if (process.platform === "win32" && server.pid) spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
  }

  mkdirSync("docs/evidence/phase-4", { recursive: true });
  writeFileSync("docs/evidence/phase-4/lighthouse.json", `${JSON.stringify({ minScore: MIN_SCORE, emulation: "Lighthouse default (mobile, simulated throttling)", results }, null, 2)}\n`);
  for (const r of results) console.log(`${r.route}: performance ${r.median} (runs ${r.scores.join(", ")}) · LCP ${r.lcpMs} ms · TBT ${r.tbtMs} ms · CLS ${r.cls}`);
  const failing = results.filter((r) => r.median < MIN_SCORE);
  if (failing.length > 0) {
    console.error(`Lighthouse performance below ${MIN_SCORE}: ${failing.map((r) => r.route).join(", ")}`);
    process.exit(1);
  }
  console.log(`All routes ≥ ${MIN_SCORE}.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
