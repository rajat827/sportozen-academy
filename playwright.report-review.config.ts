import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";

const filename = resolve(`.local/e2e-report-review-${randomUUID()}.sqlite`);
const local = relative(resolve(".local"), filename);
if (
  isAbsolute(local) ||
  local.startsWith("..") ||
  !/^e2e-report-review-[a-zA-Z0-9-]+\.sqlite$/.test(local)
)
  throw new Error(
    "Monthly review browser QA requires a fresh isolated database.",
  );
const origin = "http://127.0.0.1:3013";
process.env.SPORTOZEN_DATABASE_PATH = filename;
process.env.BETTER_AUTH_URL = origin;
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "monthly-report-review.spec.ts",
  outputDir: ".local/report-review-playwright",
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  expect: { timeout: 20000 },
  use: {
    baseURL: origin,
    browserName: "chromium",
    actionTimeout: 20000,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command:
      "node --conditions=react-server --import tsx scripts/qa-monthly-report-review.ts && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3013",
    url: origin,
    reuseExistingServer: false,
    timeout: 240000,
    env: {
      SPORTOZEN_DATABASE_PATH: filename,
      BETTER_AUTH_URL: origin,
      SPORTOZEN_QA_BUILD: "1",
      SPORTOZEN_REPORTS_QA: "1",
      SPORTOZEN_GOOGLE_PLACES_ENABLED: "0",
      SPORTOZEN_WHATSAPP_SEND_ENABLED: "false",
      SPORTOZEN_WHATSAPP_LIVE_ENABLED: "false",
    },
  },
});
