import "server-only";
import type { WorkspaceRepository } from "@/data/repositories/workspace-repository";
import type {
  AcademyConfiguration,
  AcademyMembership,
  WorkspaceKind,
  WorkspaceRecords,
} from "@/domain/workspace";
import { database } from "./database";
export const workspaceRepository: WorkspaceRepository = {
  academy(id) {
    const row = database()
      .prepare("SELECT config FROM academy_workspaces WHERE id=?")
      .get(id);
    return row
      ? (JSON.parse(String(row.config)) as AcademyConfiguration)
      : undefined;
  },
  membership(academyId, userId) {
    const row = database()
      .prepare(
        "SELECT * FROM academy_memberships WHERE academyId=? AND userId=? AND active=1",
      )
      .get(academyId, userId);
    if (
      !row ||
      (row.expiresAt && String(row.expiresAt) < new Date().toISOString())
    )
      return undefined;
    return {
      ...row,
      active: Boolean(row.active),
      sportIds: JSON.parse(String(row.sportIds)),
    } as unknown as AcademyMembership;
  },
  list<K extends WorkspaceKind>(academyId: string, kind: K) {
    return database()
      .prepare(
        "SELECT body,version FROM workspace_records WHERE academyId=? AND kind=? ORDER BY rowid",
      )
      .all(academyId, kind)
      .map(
        (r) =>
          ({
            ...JSON.parse(String(r.body)),
            ...(["plan", "report", "update", "weekly"].includes(kind)
              ? { recordVersion: Number(r.version) }
              : {}),
          }) as WorkspaceRecords[K],
      );
  },
  find<K extends WorkspaceKind>(academyId: string, kind: K, id: string) {
    const row = database()
      .prepare(
        "SELECT body,version FROM workspace_records WHERE academyId=? AND kind=? AND id=?",
      )
      .get(academyId, kind, id);
    return row
      ? ({
          ...JSON.parse(String(row.body)),
          ...(["plan", "report", "update", "weekly"].includes(kind)
            ? { recordVersion: Number(row.version) }
            : {}),
        } as WorkspaceRecords[K])
      : undefined;
  },
  save(academyId, kind, record) {
    if (record.academyId !== academyId)
      throw new Error("Record ownership mismatch");
    const sportId = "sportId" in record ? record.sportId : null,
      playerId =
        "playerId" in record
          ? record.playerId
          : kind === "player"
            ? record.id
            : null;
    database()
      .prepare(
        "INSERT INTO workspace_records(academyId,kind,id,sportId,playerId,body) VALUES(?,?,?,?,?,?) ON CONFLICT(academyId,kind,id) DO UPDATE SET body=excluded.body,sportId=excluded.sportId,playerId=excluded.playerId,version=workspace_records.version+1",
      )
      .run(
        academyId,
        kind,
        record.id,
        sportId,
        playerId,
        JSON.stringify(record),
      );
    if (kind === "session" || kind === "plan") {
      // Every writer uses this boundary. A schedule/objective/plan change must
      // invalidate queued notifications immediately, not wait for an open UI.
      const weekly = database()
        .prepare(
          "SELECT id,body FROM workspace_records WHERE academyId=? AND kind='weekly'",
        )
        .all(academyId);
      for (const row of weekly) {
        const r = JSON.parse(String(row.body)) as WorkspaceRecords["weekly"];
        if (
          !(kind === "plan"
            ? r.content.sourcePlanId === record.id
            : r.content.sessions.some((s) => s.id === record.id) ||
              ("squadId" in record && r.squadId === record.squadId))
        )
          continue;
        database()
          .prepare(
            "UPDATE delivery_jobs SET state='CANCELLED',reason='Training source changed; review required' WHERE academyId=? AND sourceId=? AND state='QUEUED'",
          )
          .run(academyId, r.id);
        if (!r.issuedAt && r.status === "APPROVED") {
          database()
            .prepare(
              "UPDATE workspace_records SET body=?,version=version+1 WHERE academyId=? AND kind='weekly' AND id=?",
            )
            .run(
              JSON.stringify({
                ...r,
                status: "INVALIDATED",
                snapshot: undefined,
                approvedAt: undefined,
                reviewerId: undefined,
              }),
              academyId,
              r.id,
            );
        }
      }
    }
  },
};
