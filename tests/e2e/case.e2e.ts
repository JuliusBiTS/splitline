/**
 * Phase 6 acceptance: the full live path with a mocked API (intake → confirm split → results →
 * export files downloaded and non-empty), the share link (no description), the manual path with
 * live mode off, and What-if Apply on a live case. The webServer runs with LIVE_MODE_ENABLED=false,
 * so unmocked API calls exercise the real fallbacks.
 */
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { getPreset } from "@/content/presets";
import { getRecordedNarrative } from "@/content/presets/narratives";

const preset = getPreset("claims-document-intake")!;
const narrative = getRecordedNarrative(preset.slug)!.narrative;
const QUOTE = preset.intake.processDescription.slice(0, 60);

async function fillIntake(page: Page) {
  await page.goto("/case/new");
  await expect(page.getByRole("note")).toContainText("Don't enter personal information.");
  // Step 1: validation first, then real values.
  await page.getByRole("button", { name: "Continue to context" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Give the use case a short title" })).toBeVisible();
  await page.getByLabel("Use-case title").fill(preset.intake.title);
  await page.getByLabel("Current process and intended AI use").fill(preset.intake.processDescription);
  await page.getByRole("button", { name: "Continue to context" }).click();

  // Step 2: the essential questions.
  await expect(page.getByRole("heading", { name: "Context" })).toBeFocused();
  await page.getByLabel("Type of organization").selectOption("bc_crown_corp");
  await page.getByLabel("Sector").selectOption("insurance");
  await page.getByLabel("Business function").selectOption(preset.intake.businessFunction);
  await page.getByLabel("What the AI does in the decision").selectOption("recommends");
  await page.getByLabel("Where the AI processes and stores data").selectOption("us_or_global_api");
  await page.getByLabel("Type of AI").selectOption("generative_llm");
  await page.getByRole("checkbox", { name: "Public or customers" }).check();
  await page.getByRole("checkbox", { name: "Health information" }).check();
  await page.getByRole("checkbox", { name: "Customer personal information" }).check();
  await page.getByRole("checkbox", { name: "British Columbia" }).check();
}

test.describe("live case (mocked API)", () => {
  test("intake → confirm split → results → downloads → share link without the description", async ({ page, browser }) => {
    let narrateBody: unknown = null;
    await page.route("**/api/live-status", (r) => r.fulfill({ json: { live: true } }));
    await page.route("**/api/decompose", (r) =>
      r.fulfill({
        json: {
          ok: true,
          decomposition: { ...preset.decomposition, suggestedUseCasePatterns: ["claims_eligibility"] },
          grounding: [{ subtaskId: "s1", sourceQuote: QUOTE }],
          caseToken: "test-token",
          caseTokenExpiresAt: "2026-11-26T12:00:00.000Z",
        },
      }),
    );
    await page.route("**/api/narrate", (r) => {
      narrateBody = r.request().postDataJSON();
      return r.fulfill({ json: { ok: true, source: "llm", narrative, tokenAccepted: true } });
    });

    await fillIntake(page);
    await page.getByRole("button", { name: "Propose the steps" }).click();

    // Step 3: the AI proposal, its grounding and a one-click pattern suggestion.
    await expect(page.getByText("The AI proposed these steps")).toBeVisible();
    await expect(page.getByText(QUOTE)).toBeVisible();
    await page.getByRole("button", { name: /Tick .Claims, underwriting or eligibility/ }).click();
    await expect(page.getByRole("button", { name: /Tick .Claims/ })).toBeHidden();
    const firstName = page.getByRole("textbox", { name: "Step name" }).first();
    await firstName.fill("Receive and sort the documents");
    await expect(page.getByText("· edited").first()).toBeVisible();
    await page.screenshot({ path: "docs/evidence/phase-6/intake-step3-1440.png", fullPage: true });
    await page.getByRole("button", { name: "Confirm split and see results" }).click();

    // Results: same workspace as the presets.
    await expect(page).toHaveURL(/\/case\/[a-z0-9]{10}$/);
    await expect(page.getByRole("heading", { level: 1, name: preset.intake.title })).toBeVisible();
    await expect(page.getByText("Go with conditions").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "In brief" })).toBeVisible();
    await expect(page.getByText("The rules engine, not the AI, set the tier")).toBeVisible();
    await expect(page.getByText("Receive and sort the documents").first()).toBeVisible();

    // Narrate got the structured intake (no description), the confirmed split and the token.
    const body = narrateBody as { intake: Record<string, unknown>; caseToken?: string; decomposition: { subtasks: unknown[] } };
    expect(body.intake).not.toHaveProperty("processDescription");
    expect(body.intake.useCasePatterns).toEqual(["claims_eligibility"]);
    expect(body.caseToken).toBe("test-token");
    expect(JSON.stringify(body)).not.toContain(QUOTE);
    await page.screenshot({ path: "docs/evidence/phase-6/case-summary-1440.png", fullPage: true });

    // Export: both files download and are non-empty.
    await page.getByRole("tab", { name: "Export" }).click();
    const [md] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download charter (Markdown)" }).click()]);
    const mdText = await readFile((await md.path())!, "utf8");
    expect(md.suggestedFilename()).toMatch(/^splitline-charter-.+\.md$/);
    expect(mdText).toContain(`# Splitline charter: ${preset.intake.title}`);
    expect(mdText).toContain("Indicative triage only, not legal advice.");
    const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download inventory record (JSON)" }).click()]);
    const record = JSON.parse(await readFile((await json.path())!, "utf8")) as Record<string, unknown>;
    expect(record.title).toBe(preset.intake.title);
    expect(record.indicativeTier).toBeTruthy();
    expect(JSON.stringify(record)).not.toContain(preset.intake.processDescription.slice(0, 40));

    // Printable charter for the case.
    await page.getByRole("link", { name: "Open the printable charter" }).click();
    // First load compiles the route in dev mode, so allow more than the default 5 s.
    await expect(page.getByRole("article")).toContainText("Before you pilot", { timeout: 30_000 });

    // Share link: a fresh browser opens the same results without the description or narrative.
    await page.goBack();
    await page.getByRole("button", { name: "Copy share link" }).click();
    const url = await page.getByLabel(/Share link/).inputValue();
    expect(url).toMatch(/#v1\./);
    expect(decodeURIComponent(url)).not.toContain(QUOTE);
    const other = await browser.newContext();
    const recipient = await other.newPage();
    await recipient.goto(url);
    await expect(recipient.getByRole("heading", { level: 1, name: preset.intake.title })).toBeVisible({ timeout: 30_000 });
    await expect(recipient.getByText("Shared case")).toBeVisible();
    await expect(recipient.getByText(/Opened from a share link/)).toBeVisible();
    await expect(recipient.getByRole("heading", { name: "In brief" })).toBeHidden();
    await expect(recipient.getByText("Go with conditions").first()).toBeVisible();
    await other.close();
  });
});

test.describe("manual path (live mode off)", () => {
  test("falls back to manual entry, enforces the consequential floor, applies a What-if", async ({ page }) => {
    await fillIntake(page);
    await page.getByRole("button", { name: "Propose the steps" }).click();
    await expect(page.getByText("Live mode is off right now")).toBeVisible();

    const names = page.getByRole("textbox", { name: "Step name" });
    await expect(names).toHaveCount(3);
    await names.nth(0).fill("Sort claim documents");
    await names.nth(1).fill("Extract amounts and dates");
    await names.nth(2).fill("Decide eligibility");
    await page.getByRole("button", { name: "Confirm split and see results" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "no step is marked as bearing on a decision about a person" })).toBeVisible();

    await page.getByRole("checkbox", { name: "Bears on a decision about a person" }).nth(2).check();
    await page.getByRole("button", { name: "Confirm split and see results" }).click();
    await expect(page).toHaveURL(/\/case\/[a-z0-9]{10}$/);
    await expect(page.getByText("steps entered by hand")).toBeVisible();

    // What-if Apply writes the change into the case (ADR-0017 §4).
    await page.getByRole("button", { name: "What if…" }).click();
    const dialog = page.getByRole("dialog", { name: "What if…" });
    await expect(dialog.getByText("Loading the engine…")).toBeHidden();
    const before = await page.getByTestId("whatif-rules-count").getAttribute("data-value");
    await dialog.getByRole("combobox", { name: "Processing and storage" }).click();
    await page.getByRole("option", { name: "In Canada" }).click();
    await expect(page.getByTestId("whatif-rules-count")).not.toHaveAttribute("data-value", before ?? "");
    await dialog.getByRole("button", { name: "Apply to design" }).click();
    await expect(page.getByText("What-if changes applied to this case")).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Export" }).click();
    await expect(page.getByRole("region", { name: "Inventory record JSON" }).or(page.getByLabel("Inventory record JSON"))).toContainText('"hosting": "in_canada"');
  });

  test("unknown case shows a friendly message", async ({ page }) => {
    await page.goto("/case/nosuchcase1");
    await expect(page.getByRole("heading", { name: "Case not found in this browser" })).toBeVisible();
    await page.goto("/case/nosuchcase1#v1.broken!");
    await expect(page.getByRole("heading", { name: "This link could not be opened" })).toBeVisible();
  });
});

test("intake works by keyboard only", async ({ page }) => {
  await page.goto("/case/new");
  await page.getByLabel("Use-case title").focus();
  await page.keyboard.type("Keyboard case");
  await page.keyboard.press("Tab");
  await page.keyboard.type(preset.intake.processDescription);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Continue to context" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Context" })).toBeFocused();
  // Native selects and checkboxes: Tab to reach, arrows and Space to choose.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Type of organization")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Type of organization")).not.toHaveValue("");
  await page.getByRole("checkbox", { name: "Patients" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: "Patients" })).toBeChecked();
});
