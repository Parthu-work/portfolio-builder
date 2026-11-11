import { defineConfig, devices } from "@playwright/test";

const BUILDER = "http://localhost:3100";
const RUNTIME = "http://localhost:3200";

/**
 * E2E runs against production builds (`pnpm build` first):
 *  - builder in LOCAL MODE (file-backed store + dev login, no Supabase needed)
 *  - runtime with the template test bench enabled
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: { trace: "off", baseURL: BUILDER },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @persona/builder start",
      url: BUILDER,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        LOCAL_MODE: "1",
        NEXT_PUBLIC_SITE_URL: BUILDER,
        RUNTIME_REPO_URL: "https://github.com/example/persona",
        ADMIN_EMAILS: "admin@example.com",
        ANALYTICS_SALT_SECRET: "e2e-secret",
      },
    },
    {
      command: "pnpm --filter persona-runtime start",
      url: RUNTIME,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ENABLE_TEMPLATE_PREVIEW: "1" },
    },
  ],
});

export { BUILDER, RUNTIME };
