import { expect, test } from "@playwright/test";

/** Fixed answers: A = 6,6,6 (+0.67), B = 2,2,2 (−0.67), lowest driver D2 → one-sided, coordination. */
const ANSWERS = { A1: 6, A2: 6, A3: 6, B1: 2, B2: 2, B3: 2, D1: 5, D2: 2, D3: 4 } as const;

test("Pulse with fixed answers gives the expected quadrant and lagging lever", async ({ page }) => {
  await page.goto("/pulse");
  await expect(page.getByText("Illustrative instrument from a conceptual thesis; not psychometrically validated.").first()).toBeVisible();
  await expect(page.getByText("Because of the work the AI system automates, …")).toBeVisible();

  // Validation: nothing answered yet.
  await page.getByRole("button", { name: "See the result" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose your role" })).toBeVisible();

  await page.getByRole("radio", { name: "Lead" }).check();
  for (const [id, v] of Object.entries(ANSWERS)) {
    await page.locator("label", { has: page.locator(`input[name="${id}"][value="${v}"]`) }).click();
  }
  await page.getByRole("button", { name: "See the result" }).click();

  const result = page.getByRole("region", { name: "Your result" });
  await expect(result.getByRole("heading", { name: "Your result" })).toBeFocused();
  await expect(result).toContainText("One-sided");
  await expect(result).toContainText("Reinforcement is the weaker of the two directions: −0.67");
  await expect(result).toContainText("Lever: Coordination (P2)");
  await expect(result).toContainText("Guardrail to keep:");
  await expect(result).toContainText("Direct cost:");
  await expect(result).toContainText("single-perspective estimate · answered as lead · illustrative, not validated");
  await page.screenshot({ path: "docs/evidence/phase-6/pulse-result-1440.png", fullPage: true });

  // Answers persist in this browser.
  await page.reload();
  await expect(page.locator('input[name="D2"][value="2"]')).toBeChecked();
});
