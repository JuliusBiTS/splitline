import { expect, test } from "@playwright/test";
import { PRESETS } from "@/content/presets";

test("home shows the tagline, the four presets and the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Design where the machine ends and judgment begins." })).toBeVisible();
  for (const p of PRESETS) await expect(page.getByRole("link", { name: p.intake.title })).toBeVisible();
  await expect(page.getByText(/AIA-inspired indicative tier (I|II|III|IV)$/)).toHaveCount(PRESETS.length);
  await expect(page.getByRole("link", { name: "Describe a use case" })).toHaveAttribute("href", "/case/new");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("Indicative triage, not legal advice.")).toBeVisible();
});
