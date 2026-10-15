import "server-only";
import type { BatchAnnouncement } from "@/domain/batch-announcement";
import { database } from "./database";
export const announcementRepository = {
  list(academyId: string): BatchAnnouncement[] {
    return database()
      .prepare(
        "SELECT body FROM batch_announcements WHERE academyId=? ORDER BY rowid DESC",
      )
      .all(academyId)
      .map((row) => JSON.parse(String(row.body)));
  },
  find(academyId: string, id: string): BatchAnnouncement | undefined {
    const row = database()
      .prepare(
        "SELECT body FROM batch_announcements WHERE academyId=? AND id=?",
      )
      .get(academyId, id);
    return row ? JSON.parse(String(row.body)) : undefined;
  },
  save(record: BatchAnnouncement) {
    database()
      .prepare("INSERT INTO batch_announcement_history VALUES(?,?,?,?)")
      .run(record.academyId, record.id, record.version, JSON.stringify(record));
    database()
      .prepare(
        "INSERT INTO batch_announcements VALUES(?,?,?) ON CONFLICT(academyId,id) DO UPDATE SET body=excluded.body",
      )
      .run(record.academyId, record.id, JSON.stringify(record));
    return record;
  },
};
