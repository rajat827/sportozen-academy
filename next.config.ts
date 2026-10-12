import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  // QA builds must not replace the assets served by an existing local app.
  distDir:
    process.env.SPORTOZEN_QA_BUILD === "1" ? ".next-football-qa" : ".next",
};
export default config;
