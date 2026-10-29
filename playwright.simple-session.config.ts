import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";

process.env.SPORTOZEN_DATABASE_PATH ??= `.local/e2e-simple-session-${randomUUID()}.sqlite`;
const testDatabase = resolve(process.env.SPORTOZEN_DATABASE_PATH);
const relativeDatabase = relative(resolve(".local"), testDatabase);
if (
  isAbsolute(relativeDatabase) ||
  relativeDatabase.startsWith("..") ||
  !/^e2e-[a-zA-Z0-9-]+\.sqlite$/.test(relativeDatabase)
)
  throw new Error(
    "Session browser tests require a dedicated .local/e2e-*.sqlite database.",
  );

const origin = "http://127.0.0.1:3012";
process.env.BETTER_AUTH_URL = origin;
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "simple-session-creation.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 420000,
  expect: { timeout: 15000 },
  outputDir: ".local/simple-session-playwright/results",
  reporter: [
    ["list"],
    ["json", { outputFile: ".local/simple-session-playwright/results.json" }],
  ],
  use: {
    baseURL: origin,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    actionTimeout: 15000,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3012",
    url: origin,
    reuseExistingServer: false,
    env: {
      SPORTOZEN_DATABASE_PATH: testDatabase,
      BETTER_AUTH_URL: origin,
      SPORTOZEN_QA_BUILD: "1",
      SPORTOZEN_FINAL_QA: "1",
      SPORTOZEN_REPORTS_QA: "0",
      SPORTOZEN_GOOGLE_PLACES_ENABLED: "0",
      SPORTOZEN_WHATSAPP_SEND_ENABLED: "false",
      SPORTOZEN_WHATSAPP_LIVE_ENABLED: "false",
    },
    timeout: 120000,
  },
});
