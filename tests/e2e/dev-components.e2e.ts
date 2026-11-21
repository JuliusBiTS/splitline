import { expect, test } from "@playwright/test";

const SECTIONS = [
  "Tokens",
  "Primitives",
  "StatusBadge",
  "VerdictCard",
  "RuleCard",
  "SplitMap",
  "LeverCard",
  "DivergingScoreBar and QuadrantChart",
  "WhatIfDrawer",
  "ReviewPanel",
  "ProgressNarration",
];

test.describe("/dev/components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/components");
  });

  test("shows every component section and the disclaimer", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Components" })).toBeVisible();
    for (const s of SECTIONS) await expect(page.getByRole("heading", { level: 2, name: s, exact: true })).toBeVisible();
    await expect(page.getByText("Indicative triage, not legal advice.")).toBeVisible();
    await expect(page.getByText("AIA-inspired indicative tier IV").first()).toBeVisible();
  });

  test("uses the design fonts and accent token", async ({ page }) => {
    const font = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/IBM Plex Sans/i);
    const bg = await page.getByRole("button", { name: "Confirm split and analyze" }).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(29, 92, 87)"); // #1D5C57 Evergreen
  });

  test("RuleCard accordion opens with the keyboard", async ({ page }) => {
    const triggers = page.locator("#rule-card ~ * [data-slot=accordion-trigger], section:has(#rule-card) [data-slot=accordion-trigger]");
    const second = triggers.nth(1);
    await expect(second).toHaveAttribute("aria-expanded", "false");
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-expanded", "true");
  });

  test("owner control edit is flagged against the AI proposal", async ({ page }) => {
    const group = page.getByRole("group", { name: "Owner for Classify documents" });
    const human = group.getByRole("button", { name: "Human" });
    await human.click();
    await expect(human).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Owner edited by you · AI proposed/).first()).toBeVisible();
  });

  test("What-if: keyboard toggles a switch and the diff changes", async ({ page }) => {
    await page.getByRole("button", { name: "What if…" }).click();
    const dialog = page.getByRole("dialog", { name: "What if…" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("No change yet. Change a setting above.")).toBeVisible();
    const sw = dialog.getByRole("switch", { name: "Crisis context (temporary centralization)" });
    await sw.focus();
    await page.keyboard.press("Space");
    await expect(sw).toBeChecked();
    await expect(dialog.getByRole("list", { name: "Differences" })).toBeVisible();
    await expect(dialog.getByText("Decision rights")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Apply to design" })).toBeEnabled();
  });

  test("ReviewPanel shortcuts: C selects Correct, 3 picks a reason; typing is not hijacked", async ({ page }) => {
    const panel = page.getByRole("group", { name: /Review panel/ });
    await panel.focus();
    await page.keyboard.press("c");
    await expect(panel.getByRole("button", { name: "Correct" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("3");
    await expect(panel.getByRole("button", { name: /3 Duplicate claim/ })).toHaveAttribute("aria-pressed", "true");
    const provider = panel.getByLabel(/Provider/);
    await provider.fill("");
    await provider.pressSequentially("Ace");
    await expect(provider).toHaveValue("Ace");
    await expect(panel.getByRole("button", { name: "Accept AI" })).toHaveAttribute("aria-pressed", "false");
    await expect(panel.getByLabel("Total", { exact: false }).last()).toHaveAttribute("aria-invalid", "true");
  });

  test("interactive targets are at least 24 × 24 px", async ({ page }) => {
    const small = await page.$$eval("main button, main [role=switch], main a, main [role=tab]", (els) =>
      els
        .filter((e) => (e as HTMLElement).offsetParent !== null)
        .map((e) => ({ name: e.textContent?.trim() || e.getAttribute("aria-label"), r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 24 || r.height < 24)
        .map(({ name, r }) => `${name}: ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });
});

test.describe("evidence screenshots", () => {
  test("desktop 1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/components");
    await page.screenshot({ path: "docs/evidence/phase-3/dev-components-1440.png", fullPage: true });
  });
  test("mobile 375", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dev/components");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "no horizontal page scroll at 375 px").toBeLessThanOrEqual(0);
    await page.screenshot({ path: "docs/evidence/phase-3/dev-components-375.png", fullPage: true });
  });
});
