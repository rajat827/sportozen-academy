import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  // QA builds must not replace the assets served by an existing local app.
  distDir:
    process.env.SPORTOZEN_QA_BUILD === "1"
      ? process.env.SPORTOZEN_REPORTS_QA === "1"
        ? ".next-professional-reports-qa"
        : process.env.SPORTOZEN_FINAL_QA === "1"
          ? ".next-final-qa"
          : process.env.SPORTOZEN_GALLERY_QA === "1"
            ? ".next-gallery-qa"
            : ".next-football-qa"
      : ".next",
  // Keep isolated QA generation within local memory and SQLite worker limits.
  experimental:
    process.env.SPORTOZEN_QA_BUILD === "1" ? { cpus: 1 } : undefined,
};
export default config;
