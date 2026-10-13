import { existsSync } from "node:fs";
for (const file of [".env.local", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
async function main() {
  const { workerTick } = await import("../src/server/communication-worker");
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });
  do {
    try {
      await workerTick();
    } catch {
      console.error(
        "Communication worker tick failed; persisted jobs retained for recovery.",
      );
    }
    if (process.argv.includes("--once")) break;
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 10000));
  } while (!stopping);
}
void main();
