import { expect, test, type Page } from "@playwright/test";
import { PRESETS } from "@/content/presets";
import { RULE_CATALOGUE } from "@/content/rules";
import { computeCase } from "@/engine";
import { VERDICT_LABELS } from "@/engine/verdict";

const TODAY = "2026-11-20";
// Rule IDs are [A-Z0-9-] only (RuleMetaSchema), so they are safe to join into a pattern unescaped.
const RULE_ID_PATTERN = new RegExp(`\\b(${RULE_CATALOGUE.map((r) => r.id).join("|")})\\b`);

/** Fails the test if the page calls any API route (presets must render with zero API calls). */
function trackApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  return calls;
}

async function openWhatIf(page: Page) {
  await page.getByRole("button", { name: "What if…" }).click();
  const dialog = page.getByRole("dialog", { name: "What if…" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Loading the engine…")).toBeHidden();
  return dialog;
}

const rulesCount = (page: Page) => page.getByTestId("whatif-rules-count");

for (const preset of PRESETS) {
  const r = computeCase(preset.intake, preset.decomposition, { today: TODAY });
  const base = r.triggeredRules.length;

  test(`${preset.slug}: open from /, verdict and tier visible, What-if hosting changes the rules count`, async ({ page }) => {
    const apiCalls = trackApiCalls(page);
    await page.goto("/");
    await page.getByRole("link", { name: preset.intake.title }).click();
    await expect(page).toHaveURL(new RegExp(`/preset/${preset.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: preset.intake.title })).toBeVisible();

    const verdict = page.getByRole("heading", { level: 2, name: VERDICT_LABELS[r.verdict.verdict], exact: true });
    await expect(verdict).toBeVisible();
    await expect(page.getByText(`AIA-inspired indicative tier ${r.tier.level}`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Indicative triage only, not legal advice. Confirm with your privacy office or counsel.").first()).toBeVisible();

    const dialog = await openWhatIf(page);
    await expect(rulesCount(page)).toHaveAttribute("data-value", String(base));
    await dialog.getByRole("combobox", { name: "Processing and storage" }).click();

    if (preset.intake.hosting !== "in_canada") {
      // Acceptance (PLAN Phase 4): hosting → in_canada changes the rules count.
      await page.getByRole("option", { name: "In Canada" }).click();
      await expect(rulesCount(page)).not.toHaveAttribute("data-value", String(base));
      await expect(dialog.getByRole("list", { name: "Differences" })).toContainText("rule");
    } else {
      // Already hosted in Canada (ADR-0017): moving it to a US/global API adds no rule, because no
      // cross-border rule reaches a BC private employer's staff data. The drawer says so.
      await page.getByRole("option", { name: "US or global API" }).click();
      await expect(dialog.getByText("No effect on tier, verdict, rules or split")).toBeVisible();
      await expect(rulesCount(page)).toHaveAttribute("data-value", String(base));
      // The drawer still recomputes: Quebec residents bring in Law 25.
      await dialog.getByRole("switch", { name: "Quebec residents affected" }).click();
      await expect(rulesCount(page)).not.toHaveAttribute("data-value", String(base));
    }
    await page.screenshot({ path: `docs/evidence/phase-4/whatif-${preset.slug}.png` });
    expect(apiCalls).toEqual([]);
  });
}

test.describe("workspace", () => {
  test("tabs work by keyboard and are linkable", async ({ page }) => {
    await page.goto("/preset/claims-document-intake");
    const summary = page.getByRole("tab", { name: "Summary" });
    await summary.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: "Triage" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/\?tab=triage$/);

    await page.goto("/preset/claims-document-intake?tab=model");
    await expect(page.getByRole("tab", { name: "Operating model" })).toHaveAttribute("aria-selected", "true");
    // Scope disclosure: plain note visible; the verbatim thesis text sits in Research basis (ADR-0018).
    await expect(page.getByText(/Its propositions are untested/)).toBeVisible();
    await expect(page.getByText("This is a starting split: it will move.").first()).toBeVisible();
    // Every lever keeps its guardrail and its cost visible (02_* §1.7).
    await expect(page.getByRole("heading", { name: "Keep in place", exact: true })).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "What it costs you", exact: true })).toHaveCount(3);
    const research = page.getByRole("button", { name: "Research basis for this tab" });
    await research.click();
    await expect(page.getByText(/The thesis propositions are untested/)).toBeVisible();
    await expect(page.getByText("Reinforcement = min(A→B, B→A)", { exact: false })).toBeVisible();
  });

  test("manager view: plain owner labels, owners on conditions, no internal IDs", async ({ page }) => {
    await page.goto("/preset/claims-document-intake");
    const brief = page.getByRole("tabpanel", { name: "Summary" });
    await expect(brief.getByRole("heading", { name: "Before you pilot" })).toBeVisible();
    await expect(brief.getByText("Likely owner:").first()).toBeVisible();
    await expect(brief.getByRole("heading", { name: "Who does what" })).toBeVisible();
    await expect(brief.getByText("AI drafts, a person checks and signs off").first()).toBeVisible();
    await expect(brief.getByRole("heading", { name: "What it costs you" })).toBeVisible();
    await expect(brief.getByText(/straight-through processing stays at zero for the first 60 days/)).toBeVisible();
    // The condition list appears once (no duplicate "Top conditions" block).
    await expect(brief.getByText("Top conditions", { exact: true })).toHaveCount(0);
    for (const tab of ["summary", "model", "rollout"]) {
      await page.goto(`/preset/claims-document-intake?tab=${tab}`);
      const text = await page.getByRole("tabpanel").innerText();
      expect(text, tab).not.toMatch(/\bs\d\b|\(P[1-4]\)|Table 4|Section 6\.4|DAYS DAYS|Days Days/i);
      // No rule ID from the whole catalogue on the main view (rule IDs live on the Governance Map).
      expect(text, tab).not.toMatch(RULE_ID_PATTERN);
    }
  });

  test("direct load without JS: the workspace is inside the main landmark", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/preset/claims-document-intake");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await main.innerText()).not.toContain("Loading");
    await ctx.close();
  });

  test("Summary buttons open the What-if drawer and the Operating model tab", async ({ page }) => {
    await page.goto("/preset/contract-clause-review");
    await page.getByRole("button", { name: "Try a what-if" }).click();
    await expect(page.getByRole("dialog", { name: "What if…" })).toBeVisible();
    await page.getByRole("dialog", { name: "What if…" }).getByRole("button", { name: "Close" }).first().click();
    await page.getByRole("button", { name: "See how your team runs it" }).click();
    await expect(page.getByRole("tab", { name: "Operating model" })).toHaveAttribute("aria-selected", "true");
  });

  test("clinical preset: DADM is reference only for a non-federal body", async ({ page }) => {
    await page.goto("/preset/clinical-referral-triage?tab=model");
    await expect(page.getByText(/Reference: DADM Appendix C \(mandatory for federal institutions only\)/).first()).toBeVisible();
  });

  test("Rollout and Export tabs render engine output", async ({ page }) => {
    await page.goto("/preset/hiring-and-sentiment?tab=rollout");
    await expect(page.getByRole("heading", { name: "90-day rollout" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Corrections flowing back" })).toBeVisible();
    await page.getByRole("tab", { name: "Export" }).click();
    await expect(page.getByLabel("Inventory record JSON")).toContainText('"verdict": "redesign"');
  });
});

test.describe("evidence screenshots", () => {
  const OUT = "docs/evidence/phase-4";
  for (const [w, h] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    test(`home and Summary at ${w} px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const [name, url] of [
        ["home", "/"],
        ["summary-clinical", "/preset/clinical-referral-triage"],
      ] as const) {
        await page.goto(url);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `no horizontal page scroll on ${url} at ${w} px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
      }
    });
  }

  test("What-if drawer open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preset/clinical-referral-triage");
    const dialog = await openWhatIf(page);
    await dialog.getByRole("combobox", { name: "Processing and storage" }).click();
    await page.getByRole("option", { name: "In Canada" }).click();
    await expect(dialog.getByRole("list", { name: "Differences" })).toBeVisible();
    await page.screenshot({ path: `${OUT}/whatif-clinical-1440.png` });
  });
});
