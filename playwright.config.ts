import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";
// The spawned server and test operator commands share an isolated fictional database.
process.env.SPORTOZEN_DATABASE_PATH ??= `.local/e2e-${randomUUID()}.sqlite`;
const testDatabase = resolve(process.env.SPORTOZEN_DATABASE_PATH);
const relativeDatabase = relative(resolve(".local"), testDatabase);
if (
  isAbsolute(relativeDatabase) ||
  relativeDatabase.startsWith("..") ||
  !/^e2e-[a-zA-Z0-9-]+\.sqlite$/.test(relativeDatabase)
)
  throw new Error(
    "Browser tests require a dedicated .local/e2e-*.sqlite database.",
  );
const origin = "http://127.0.0.1:3001";
process.env.BETTER_AUTH_URL = origin;
export default defineConfig({
  testDir: "./tests/e2e",
  // Monthly report review seeds and starts its own server on port 3013; run it
  // with playwright.report-review.config.ts (a separate CI job).
  testIgnore: "monthly-report-review.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: origin,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm start --port 3001",
    url: origin,
    reuseExistingServer: false,
    env: {
      SPORTOZEN_DATABASE_PATH: testDatabase,
      BETTER_AUTH_URL: origin,
      SPORTOZEN_GOOGLE_PLACES_ENABLED: "0",
      SPORTOZEN_WHATSAPP_SEND_ENABLED: "false",
      SPORTOZEN_WHATSAPP_LIVE_ENABLED: "false",
      ...(process.env.SPORTOZEN_QA_BUILD === "1"
        ? { SPORTOZEN_QA_BUILD: "1" }
        : {}),
      ...(process.env.SPORTOZEN_GALLERY_QA === "1"
        ? { SPORTOZEN_GALLERY_QA: "1" }
        : {}),
      ...(process.env.SPORTOZEN_FINAL_QA === "1"
        ? { SPORTOZEN_FINAL_QA: "1" }
        : {}),
      ...(process.env.SPORTOZEN_PLAYER_FORM_QA === "1"
        ? { SPORTOZEN_PLAYER_FORM_QA: "1" }
        : {}),
    },
    timeout: 120000,
  },
});
