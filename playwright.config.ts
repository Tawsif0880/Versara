import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3107",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command: "npm.cmd run start -- --port 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
