import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "e2e", testMatch: /.*\.e2e\.ts$/, use: { ...devices["Desktop Chrome"] } },
    { name: "a11y", testMatch: /.*\.a11y\.ts$/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // CI builds first (see .github/workflows/ci.yml) and serves the production build.
    command: isCI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { LIVE_MODE_ENABLED: "false" },
  },
});
