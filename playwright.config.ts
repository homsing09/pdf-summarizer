import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/playwright",
  fullyParallel: true,
  retries: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], browserName: "chromium" } },
    { name: "android-chrome", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "ios-safari", use: { ...devices["iPhone 14"], browserName: "webkit" } },
  ],
  webServer: { command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: true, timeout: 120_000 },
});
