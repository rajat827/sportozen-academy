import { spawn, type ChildProcess } from "node:child_process";
import { resolve, relative, isAbsolute } from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";

export async function verifyWorkspaceRestart(
  playwright: Pick<typeof import("@playwright/test"), "request">,
  account: APIRequestContext,
  academyId: string,
) {
  const filename = resolve(process.env.SPORTOZEN_DATABASE_PATH ?? "");
  const localPath = relative(resolve(".local"), filename);
  if (
    isAbsolute(localPath) ||
    localPath.startsWith("..") ||
    !/^e2e-[a-zA-Z0-9-]+\.sqlite$/.test(localPath)
  )
    throw new Error(
      "Restart check requires the guarded fictional test database.",
    );
  const origin = "http://127.0.0.1:3002";
  const initial = await fetch(`${origin}/sign-in`).catch(() => null);
  if (initial)
    throw new Error(
      "Restart test port already occupied; existing servers must be preserved.",
    );
  const records = (
    await (await account.get(`/api/workspaces/${academyId}`)).json()
  ).records;
  let server: ChildProcess | undefined;
  async function start() {
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3002",
      ],
      {
        env: {
          ...process.env,
          SPORTOZEN_DATABASE_PATH: filename,
          BETTER_AUTH_URL: origin,
        },
        stdio: "ignore",
      },
    );
    let launchError: Error | undefined;
    server.once("error", (error) => {
      launchError = error;
    });
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (launchError || server.exitCode !== null)
        throw launchError ?? new Error("Restart test server exited.");
      const response = await fetch(`${origin}/sign-in`).catch(() => null);
      if (response?.ok) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Restart test server did not become ready.");
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const owned = server;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Owned test server did not stop.")),
        15000,
      );
      owned.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      owned.kill();
    });
    server = undefined;
  }
  const reader = await playwright.request.newContext({
    baseURL: origin,
    storageState: await account.storageState(),
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    await start();
    expect(
      (await (await reader.get(`/api/workspaces/${academyId}`)).json()).records,
    ).toEqual(records);
    await stop();
    await start();
    expect(
      (await (await reader.get(`/api/workspaces/${academyId}`)).json()).records,
    ).toEqual(records);
  } finally {
    await reader.dispose();
    await stop();
  }
}
