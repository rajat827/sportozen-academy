import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
const access = JSON.parse(
  readFileSync(".local/professional-report-access.json", "utf8"),
) as { databasePath: string };
const filename = resolve(access.databasePath),
  local = relative(resolve(".local"), filename);
if (
  isAbsolute(local) ||
  local.startsWith("..") ||
  !/^e2e-bharat-[a-zA-Z0-9-]+\.sqlite$/.test(local)
)
  throw new Error("Report QA requires the isolated fictional Bharat database.");
process.env.SPORTOZEN_DATABASE_PATH = filename;
export default defineConfig({
  testDir: "./tests/professional",
  outputDir: ".local/professional-reports-playwright",
  workers: 1,
  fullyParallel: false,
  timeout: 900000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3004",
    browserName: "chromium",
    trace: "retain-on-failure",
    actionTimeout: 15000,
  },
  webServer: {
    command: "pnpm start --port 3004",
    url: "http://127.0.0.1:3004",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      SPORTOZEN_DATABASE_PATH: filename,
      BETTER_AUTH_URL: "http://127.0.0.1:3004",
      SPORTOZEN_QA_BUILD: "1",
      SPORTOZEN_REPORTS_QA: "1",
      SPORTOZEN_GOOGLE_PLACES_ENABLED: "0",
      SPORTOZEN_WHATSAPP_SEND_ENABLED: "false",
      SPORTOZEN_WHATSAPP_LIVE_ENABLED: "false",
    },
  },
});
