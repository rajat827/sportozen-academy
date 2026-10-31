import type { DatabaseSync } from "node:sqlite";
export function migrateBatchAnnouncements(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS batch_announcements(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(academyId,id));
    CREATE TABLE IF NOT EXISTS batch_announcement_history(academyId TEXT NOT NULL,id TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(academyId,id,version));`);
}
