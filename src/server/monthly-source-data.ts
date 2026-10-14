import "server-only";
import { createHash } from "node:crypto";
import type { ReportingPeriod } from "@/domain/communication";
import { monthlyRecords } from "@/services/communication/period-rules";
import { workspaceRepository as repo } from "./workspace-repository";
/** Read-only projection of one authorised child's history, never another roster child's notes. */
export function monthlySourceData(
  academyId: string,
  playerId: string,
  period: ReportingPeriod,
) {
  const attendance = repo
    .list(academyId, "attendance")
    .filter((a) => a.sportId === "football" && a.playerId === playerId);
  const records = monthlyRecords(
    playerId,
    period,
    repo.list(academyId, "session"),
    attendance,
    repo.list(academyId, "evidence").filter((e) => e.sportId === "football"),
  );
  const sources = {
    sessions: records.actual.map((s) => ({
      id: s.id,
      version: s.version,
      startAt: s.startAt,
      endAt: s.endAt,
      timezone: s.timezone,
      status: s.status,
      theme: s.theme,
      agenda: s.agenda,
      objectives: s.objectives.filter((o) => o.playerId === playerId),
    })),
    attendance: attendance.filter((a) =>
      records.actual.some((s) => s.id === a.sessionId),
    ),
    evidence: records.eligible.map(({ staffNote: _private, ...e }) => {
      void _private;
      return e;
    }),
  };
  return {
    records,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(sources))
      .digest("hex"),
  };
}
