import type { DatabaseSync } from "node:sqlite";
export function migrateCommunications(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS communication_settings(academyId TEXT PRIMARY KEY REFERENCES academy_workspaces(id), body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS guardian_contacts(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),guardianId TEXT NOT NULL,phone TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(academyId,guardianId),UNIQUE(academyId,phone));
    CREATE TABLE IF NOT EXISTS delivery_jobs(id TEXT PRIMARY KEY,academyId TEXT NOT NULL REFERENCES academy_workspaces(id),playerId TEXT NOT NULL,guardianId TEXT NOT NULL,type TEXT NOT NULL,sourceId TEXT NOT NULL,sourceVersion INTEGER NOT NULL,period TEXT NOT NULL,correction TEXT NOT NULL DEFAULT '',dueAt TEXT NOT NULL,expiresAt TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,providerId TEXT,reason TEXT,claim TEXT,claimedAt TEXT,UNIQUE(academyId,playerId,guardianId,type,period,correction));
    CREATE UNIQUE INDEX IF NOT EXISTS delivery_provider_receipt ON delivery_jobs(providerId) WHERE providerId IS NOT NULL;
    CREATE TABLE IF NOT EXISTS delivery_attempts(id TEXT PRIMARY KEY,jobId TEXT NOT NULL REFERENCES delivery_jobs(id),at TEXT NOT NULL,state TEXT NOT NULL,providerId TEXT,reason TEXT,metadata TEXT);
    CREATE TABLE IF NOT EXISTS communication_events(id TEXT PRIMARY KEY,academyId TEXT NOT NULL,phoneNumberId TEXT NOT NULL,body TEXT NOT NULL,receivedAt TEXT NOT NULL,processedAt TEXT,outcome TEXT);
    CREATE TABLE IF NOT EXISTS communication_reminders(academyId TEXT NOT NULL,period TEXT NOT NULL,type TEXT NOT NULL,playerId TEXT NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(academyId,period,type,playerId));
  `);
  if (
    !db
      .prepare("PRAGMA table_info(delivery_attempts)")
      .all()
      .some((c) => c.name === "metadata")
  )
    db.exec("ALTER TABLE delivery_attempts ADD COLUMN metadata TEXT");
  if (Number(db.prepare("PRAGMA user_version").get()?.user_version) < 3)
    db.exec("PRAGMA user_version=3");
}
