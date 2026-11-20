import { expect, test } from "@playwright/test";

test("home renders the product name and the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Splitline" })).toBeVisible();
  await expect(page.getByText("Indicative triage, not legal advice.")).toBeVisible();
});
