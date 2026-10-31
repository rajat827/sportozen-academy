import type { DatabaseSync } from "node:sqlite";
/** Additive migration: never rewrite historical records or reset customer storage. */
export function migrateFootballTraining(db: DatabaseSync) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS training_submissions(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),userId TEXT NOT NULL,requestId TEXT NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(academyId,userId,requestId));
      CREATE TABLE IF NOT EXISTS training_history(id INTEGER PRIMARY KEY AUTOINCREMENT,academyId TEXT NOT NULL REFERENCES academy_workspaces(id),kind TEXT NOT NULL,recordId TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,actorId TEXT NOT NULL,at TEXT NOT NULL);`);
    const version = Number(
      db.prepare("PRAGMA user_version").get()?.user_version ?? 0,
    );
    if (version < 2) db.exec("PRAGMA user_version=2");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
