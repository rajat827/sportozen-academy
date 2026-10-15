import "server-only";
import { z } from "zod";
import { atomic, database } from "./database";
import { WorkspaceError } from "./auth";
import {
  requireModule,
  requireRole,
  requireSport,
  visibleRecord,
  type WorkspaceAccess,
} from "./workspace-access";
import {
  createGooglePlacesClient,
  googlePlacesConfig,
  placesConfigured,
} from "./google-places";

function permitted(ctx: WorkspaceAccess) {
  requireRole(ctx, ["OWNER", "ADMIN", "COACH"]);
  requireModule(ctx, "session");
  requireSport(ctx, "football");
}
export function sessionPlacesStatus(ctx: WorkspaceAccess) {
  permitted(ctx);
  return { status: placesConfigured() ? "AVAILABLE" : "CONFIGURATION_BLOCKED" };
}
function limit(value: string | undefined, fallback: number, ceiling: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= ceiling
    ? parsed
    : fallback;
}
export function reservePlaceRequest(ctx: WorkspaceAccess, now = Date.now()) {
  const limits = [
    {
      scope: `user:${ctx.user.id}`,
      bucket: `minute:${Math.floor(now / 60000)}`,
      max: limit(process.env.SPORTOZEN_GOOGLE_PLACES_PER_USER_MINUTE, 10, 30),
      expiresAt: now + 120000,
    },
    {
      scope: "academy",
      bucket: `day:${Math.floor(now / 86400000)}`,
      max: limit(
        process.env.SPORTOZEN_GOOGLE_PLACES_PER_ACADEMY_DAY,
        200,
        1000,
      ),
      expiresAt: now + 2 * 86400000,
    },
  ];
  atomic(() => {
    const db = database();
    db.prepare("DELETE FROM session_places_usage WHERE expiresAt < ?").run(now);
    for (const item of limits) {
      const used = db
        .prepare(
          "SELECT requests FROM session_places_usage WHERE academyId=? AND scope=? AND bucket=?",
        )
        .get(ctx.academy.id, item.scope, item.bucket);
      if (Number(used?.requests ?? 0) >= item.max)
        throw new WorkspaceError(
          429,
          "The Maps search limit has been reached. Use a manual location or try again later.",
        );
    }
    for (const item of limits)
      db.prepare(
        "INSERT INTO session_places_usage(academyId,scope,bucket,requests,expiresAt) VALUES(?,?,?,1,?) ON CONFLICT(academyId,scope,bucket) DO UPDATE SET requests=requests+1",
      ).run(ctx.academy.id, item.scope, item.bucket, item.expiresAt);
  });
}
const scope = { squadId: z.string().min(1).max(100), sessionToken: z.uuid() };
const command = z.discriminatedUnion("action", [
  z.object({
    ...scope,
    action: z.literal("search"),
    query: z.string().trim().min(3).max(120),
  }),
  z.object({
    ...scope,
    action: z.literal("select"),
    operationalLocation: z.string().trim().min(1).max(2000),
    placeId: z
      .string()
      .min(1)
      .max(300)
      .regex(/^[A-Za-z0-9_-]+$/),
  }),
]);
export async function sessionPlacesAction(
  ctx: WorkspaceAccess,
  input: unknown,
) {
  permitted(ctx);
  const value = command.parse(input);
  visibleRecord(ctx, "squad", value.squadId);
  const config = googlePlacesConfig();
  if (!placesConfigured(config))
    throw new WorkspaceError(
      503,
      "Google Maps is configuration-blocked. Enter the training location manually.",
    );
  reservePlaceRequest(ctx);
  const client = createGooglePlacesClient(config);
  if (value.action === "search")
    return {
      suggestions: await client.search(
        value.query,
        value.sessionToken,
        ctx.academy.country,
      ),
    };
  return {
    place: await client.select(
      value.placeId,
      value.sessionToken,
      {
        academyId: ctx.academy.id,
        userId: ctx.user.id,
      },
      value.operationalLocation,
    ),
  };
}
