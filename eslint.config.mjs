import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".local/**",
    ".next/**",
    ".next-football-qa/**",
    ".next-gallery-qa/**",
    ".next-final-qa/**",
    ".next-professional-reports-qa/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
