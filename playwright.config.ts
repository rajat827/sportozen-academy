import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
// The spawned server and test operator commands share an isolated fictional database.
process.env.SPORTOZEN_DATABASE_PATH ??= `.local/e2e-${randomUUID()}.sqlite`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    env: { SPORTOZEN_DATABASE_PATH: process.env.SPORTOZEN_DATABASE_PATH },
    timeout: 120000,
  },
});
