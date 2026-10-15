import "server-only";
import type {
  AcademyRole,
  WorkspaceKind,
  WorkspaceRecords,
} from "@/domain/workspace";
import { workspaceRepository as repository } from "./workspace-repository";
import { authenticatedUser, WorkspaceError } from "./auth";
import { audit, database } from "./database";
export async function access(headers: Headers, academyId: string) {
  const user = await authenticatedUser(headers),
    membership = repository.membership(academyId, user.id),
    academy = repository.academy(academyId);
  if (!membership || !academy)
    throw new WorkspaceError(403, "No active membership in this academy.");
  const entitlement = database()
    .prepare("SELECT status FROM platform_entitlements WHERE academyId=?")
    .get(academyId);
  if (entitlement?.status !== "ACTIVE")
    throw new WorkspaceError(
      403,
      "This academy workspace is currently suspended.",
    );
  return { user, membership, academy };
}
export type WorkspaceAccess = Awaited<ReturnType<typeof access>>;
export function requireRole(ctx: WorkspaceAccess, roles: AcademyRole[]) {
  if (!roles.includes(ctx.membership.role))
    throw new WorkspaceError(
      403,
      "Your academy role cannot perform this action.",
    );
}
export function requireSport(ctx: WorkspaceAccess, sportId: string) {
  if (
    sportId !== "football" ||
    !ctx.academy.sportIds.includes(sportId) ||
    (ctx.membership.sportIds.length &&
      !ctx.membership.sportIds.includes(sportId))
  )
    throw new WorkspaceError(
      403,
      "Only football is available in this release and academy assignment.",
    );
}
const parentKinds = new Set<WorkspaceKind>([
  "weekly",
  "player",
  "plan",
  "report",
  "update",
  "conversation",
  "preference",
  "dietary",
  "fee",
]);
// Historical sports remain in storage; customer APIs never expose or mutate them.
function activeFootballRecords<K extends WorkspaceKind>(
  ctx: WorkspaceAccess,
  records: WorkspaceRecords[K][],
): WorkspaceRecords[K][] {
  return records
    .filter((record) => {
      if ("sportId" in record && record.sportId !== "football") return false;
      if ("sportIds" in record && !record.sportIds.includes("football"))
        return false;
      if ("playerId" in record) {
        const player = repository.find(
          ctx.academy.id,
          "player",
          record.playerId,
        );
        if (!player?.sportIds.includes("football")) return false;
      }
      return true;
    })
    .map((record) =>
      "sportIds" in record ? { ...record, sportIds: ["football"] } : record,
    );
}
export function moduleEnabled(ctx: WorkspaceAccess, kind: WorkspaceKind) {
  const required =
    kind === "fee"
      ? "fees"
      : kind === "report"
        ? "reports"
        : ["update", "conversation", "preference", "dietary"].includes(kind)
          ? "communication"
          : [
                "player",
                "plan",
                "drill",
                "program",
                "squad",
                "venue",
                "session",
                "attendance",
                "evidence",
                "weekly",
              ].includes(kind)
            ? "development"
            : undefined;
  if (!required) return true;
  const row = database()
    .prepare("SELECT modules FROM platform_entitlements WHERE academyId=?")
    .get(ctx.academy.id);
  return (
    ctx.academy.modules.includes(required) &&
    Boolean(row && JSON.parse(String(row.modules)).includes(required))
  );
}
export function requireModule(ctx: WorkspaceAccess, kind: WorkspaceKind) {
  if (!moduleEnabled(ctx, kind))
    throw new WorkspaceError(
      403,
      "This module is not enabled for the academy subscription and configuration.",
    );
}
export function visibleRecords<K extends WorkspaceKind>(
  ctx: WorkspaceAccess,
  kind: K,
): WorkspaceRecords[K][] {
  if (!moduleEnabled(ctx, kind)) return [];
  if (kind === "fee" && ["COACH", "SUPPORT"].includes(ctx.membership.role))
    return [];
  const { academy, membership, user } = ctx,
    restricted = membership.role === "PARENT" || membership.role === "SUPPORT";
  if (!restricted) {
    return activeFootballRecords(ctx, repository.list(academy.id, kind))
      .filter(
        (r) =>
          !("sportId" in r) ||
          !membership.sportIds.length ||
          membership.sportIds.includes(r.sportId),
      )
      .filter((r) => {
        if (membership.role !== "COACH") return true;
        if (kind === "session")
          return (
            (r as WorkspaceRecords["session"]).coachIds.includes(user.id) &&
            (r as WorkspaceRecords["session"]).roster.every(
              (p) =>
                repository.find(academy.id, "player", p.playerId)?.coachId ===
                user.id,
            )
          );
        if (kind === "squad")
          return (r as WorkspaceRecords["squad"]).playerIds.every(
            (id) =>
              repository.find(academy.id, "player", id)?.coachId === user.id,
          );
        if (
          "sessionId" in r &&
          !repository
            .find(academy.id, "session", r.sessionId)
            ?.coachIds.includes(user.id)
        )
          return false;
        if (kind === "player")
          return (r as WorkspaceRecords["player"]).coachId === user.id;
        if ("playerId" in r) {
          const p = repository.find(academy.id, "player", r.playerId);
          return p?.coachId === user.id;
        }
        return true;
      });
  }
  if (!parentKinds.has(kind)) return [];
  if (
    membership.role === "SUPPORT" &&
    ["preference", "dietary", "conversation", "update"].includes(kind)
  )
    return [];
  let values: unknown[];
  if (kind === "preference")
    values = database()
      .prepare(
        "SELECT body FROM workspace_records WHERE academyId=? AND kind=? AND json_extract(body,'$.userId')=?",
      )
      .all(academy.id, kind, user.id)
      .map((r) => JSON.parse(String(r.body)));
  else if (kind === "plan") {
    const reports = visibleRecords(ctx, "report");
    values = reports
      .map((r) => r.approvedPlan)
      .filter(Boolean)
      .sort((a, b) => (b?.recordVersion ?? 0) - (a?.recordVersion ?? 0))
      .filter((p, i, list) => list.findIndex((q) => q?.id === p?.id) === i);
  } else
    values = database()
      .prepare(
        `SELECT r.body FROM workspace_records r JOIN ${membership.role === "SUPPORT" ? "support_relationships" : "guardian_relationships"} g ON g.academyId=r.academyId AND g.playerId=r.playerId WHERE r.academyId=? AND r.kind=? AND g.userId=?`,
      )
      .all(academy.id, kind, user.id)
      .map((r) => JSON.parse(String(r.body)));
  if (kind === "report")
    values = (values as WorkspaceRecords["report"][])
      .filter((r) => r.status === "Approved" && r.snapshot)
      .map((r) => ({ ...r, monthlySources: undefined }));
  if (kind === "weekly")
    values = (values as WorkspaceRecords["weekly"][])
      .filter((r) => r.status === "APPROVED" && r.snapshot && r.issuedAt)
      .map((r) => ({ ...r, content: r.snapshot! }));
  if (kind === "update")
    values = (values as WorkspaceRecords["update"][]).filter(
      (r) =>
        r.approvalStatus === "APPROVED" &&
        r.inAppPublicationStatus === "PUBLISHED" &&
        r.publishedGuardianIds?.includes(user.id),
    );
  if (kind === "conversation")
    values = (values as WorkspaceRecords["conversation"][])
      .filter((r) => r.guardianId === user.id)
      .map((r) => ({ ...r, messages: r.messages.filter((m) => !m.internal) }));
  if (kind === "dietary")
    values = (values as WorkspaceRecords["dietary"][]).filter(
      (r) => r.userId === user.id,
    );
  if (membership.role === "SUPPORT")
    audit(academy.id, user.id, "Authorised support read", kind);
  return activeFootballRecords(ctx, values as WorkspaceRecords[K][]);
}
export function visibleRecord<K extends WorkspaceKind>(
  ctx: WorkspaceAccess,
  kind: K,
  id: string,
) {
  const value = visibleRecords(ctx, kind).find((r) => r.id === id);
  if (!value)
    throw new WorkspaceError(
      404,
      "Record not available in this academy and role.",
    );
  return value;
}
export function requirePlayer(ctx: WorkspaceAccess, playerId: string) {
  return visibleRecord(ctx, "player", playerId);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const publicOrigin = new URL(
    process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  ).origin;
  if (origin !== publicOrigin)
    throw new WorkspaceError(403, "A same-origin request is required.");
}
export function privateJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store, private", Vary: "Cookie" },
  });
}
export function apiError(e: unknown) {
  if (e instanceof WorkspaceError)
    return privateJson({ error: e.message }, e.status);
  if (e instanceof Error && e.name === "ZodError")
    return privateJson(
      { error: "Check the required fields and valid record links." },
      400,
    );
  console.error(
    "Workspace request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return privateJson({ error: "The request could not be completed." }, 500);
}
