import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PRESETS } from "@/content/presets";

/** Routes to scan (SPEC §12). Phase 8 extends this to every route. */
const ROUTES = [
  "/",
  ...PRESETS.flatMap((p) => [`/preset/${p.slug}`, `/preset/${p.slug}?tab=triage`, `/preset/${p.slug}?tab=model`, `/preset/${p.slug}?tab=rollout`, `/preset/${p.slug}?tab=export`]),
  "/sources",
  "/self-assessment",
  "/about",
  "/dev/components",
];

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

for (const route of ROUTES) {
  test(`no serious or critical axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const blocking = await blockingViolations(page);
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

test("no serious or critical axe violations with the What-if drawer open", async ({ page }) => {
  await page.goto("/preset/claims-document-intake");
  await page.getByRole("button", { name: "What if…" }).click();
  const dialog = page.getByRole("dialog", { name: "What if…" });
  await expect(dialog.getByText("Loading the engine…")).toBeHidden();
  await dialog.getByRole("switch", { name: "Crisis context (temporary centralization)" }).click();
  await expect(dialog.getByRole("list", { name: "Differences" })).toBeVisible();
  const blocking = await blockingViolations(page);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test("no serious or critical axe violations on / at 375 px with the menu open", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const blocking = await blockingViolations(page);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
