import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 15_000,
  use: {
    baseURL: "http://localhost:3999",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
  webServer: {
    command: "ENABLE_TEST_SEED=true ENABLE_TEST_AUTH=true pnpm dev --port 3999",
    port: 3999,
    reuseExistingServer: !process.env.CI,
  },
});
