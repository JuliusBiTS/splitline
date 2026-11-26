import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getPreset } from "@/content/presets";

const preset = getPreset("clinical-referral-triage")!;

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

async function expectClean(page: Page) {
  const blocking = await blockingViolations(page);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

/** Seeds a saved case in localStorage so `/case/<id>` renders without the intake. */
async function seedCase(page: Page, id: string) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [
      `splitline:case:${id}`,
      JSON.stringify({ v: 1, id, asOf: "2026-11-20", intake: preset.intake, fromShareLink: false, proposed: null, decomposition: preset.decomposition, entry: "manual" }),
    ] as const,
  );
}

test("intake steps 1–3 (with errors and the manual table)", async ({ page }) => {
  await page.goto("/case/new");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Continue to context" }).click();
  await expect(page.getByText("Check these fields first")).toBeVisible();
  await expectClean(page);

  await page.getByLabel("Use-case title").fill(preset.intake.title);
  await page.getByLabel("Current process and intended AI use").fill(preset.intake.processDescription);
  await page.getByRole("button", { name: "Continue to context" }).click();
  await page.getByRole("button", { name: "Propose the steps" }).click();
  await expect(page.getByText("Check these fields first")).toBeVisible();
  await page.locator("details summary").click();
  await expectClean(page);

  await page.getByLabel("Type of organization").selectOption(preset.intake.orgType);
  await page.getByLabel("Sector").selectOption(preset.intake.sector);
  await page.getByLabel("Business function").selectOption(preset.intake.businessFunction);
  await page.getByLabel("What the AI does in the decision").selectOption(preset.intake.aiDecisionRole);
  await page.getByLabel("Where the AI processes and stores data").selectOption(preset.intake.hosting);
  await page.getByLabel("Type of AI").selectOption(preset.intake.aiType);
  await page.getByRole("checkbox", { name: "Patients" }).check();
  await page.getByRole("checkbox", { name: "Health information" }).check();
  await page.getByRole("checkbox", { name: "British Columbia" }).check();
  await page.getByRole("button", { name: "Propose the steps" }).click();
  await expect(page.getByText("Live mode is off right now")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Confirm split and see results" }).click();
  await expect(page.getByText("Before you confirm")).toBeVisible();
  await expectClean(page);
});

test("case workspace, all tabs", async ({ page }) => {
  await seedCase(page, "a11ycase01");
  for (const tab of ["", "?tab=triage", "?tab=model", "?tab=rollout", "?tab=export"]) {
    await page.goto(`/case/a11ycase01${tab}`);
    await expect(page.getByRole("heading", { level: 1, name: preset.intake.title })).toBeVisible({ timeout: 30_000 });
    await expectClean(page);
  }
});

test("case and preset charter print views", async ({ page }) => {
  await seedCase(page, "a11ycase02");
  await page.goto("/case/a11ycase02/charter");
  await expect(page.getByRole("article")).toBeVisible({ timeout: 30_000 });
  await expectClean(page);
  await page.goto(`/preset/${preset.slug}/charter`);
  await expect(page.getByRole("article")).toBeVisible({ timeout: 30_000 });
  await expectClean(page);
});

test("missing case message", async ({ page }) => {
  await page.goto("/case/missing0001");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expectClean(page);
});

test("Pulse survey and result", async ({ page }) => {
  await page.goto("/pulse");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expectClean(page);
  await page.getByRole("radio", { name: "Augmentation work" }).check();
  for (const id of ["A1", "A2", "A3", "B1", "B2", "B3", "D1", "D2", "D3"]) await page.locator("label", { has: page.locator(`input[name="${id}"][value="5"]`) }).click();
  await page.getByRole("button", { name: "See the result" }).click();
  await expect(page.getByRole("region", { name: "Your result" })).toContainText("Virtuous");
  await expectClean(page);
});
