import "server-only";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { database } from "./database";
function localSecret() {
  const dir = resolve(".local");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, "auth-secret");
  if (!existsSync(path))
    writeFileSync(path, randomBytes(48).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  return readFileSync(path, "utf8");
}
const baseURL = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000";
const local = ["localhost", "127.0.0.1", "[::1]"].includes(
  new URL(baseURL).hostname,
);
if (
  !local &&
  (!process.env.BETTER_AUTH_SECRET || !baseURL.startsWith("https://"))
)
  throw new Error(
    "Deployment requires HTTPS BETTER_AUTH_URL and server-side BETTER_AUTH_SECRET.",
  );
const authOptions = {
  database: database(),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? localSecret(),
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  session: { expiresIn: 60 * 60 * 8, cookieCache: { enabled: false } },
  rateLimit: {
    enabled: true,
    storage: "database" as const,
    window: 60,
    max: 60,
  },
  advanced: { useSecureCookies: !local },
  plugins: [nextCookies()],
};
let auth: ReturnType<typeof betterAuth<typeof authOptions>> | undefined;
let migrations: Promise<void> | undefined;
export async function authentication() {
  migrations ??= (async () => {
    const migration = await getMigrations(authOptions);
    await migration.runMigrations();
  })();
  await migrations;
  auth ??= betterAuth(authOptions);
  return auth;
}
export async function authenticatedUser(headers: Headers) {
  const session = await (await authentication()).api.getSession({ headers });
  if (!session)
    throw new WorkspaceError(401, "Sign in to access academy workspaces.");
  return session.user;
}
export class WorkspaceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
