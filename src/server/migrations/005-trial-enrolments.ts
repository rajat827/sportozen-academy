import type { DatabaseSync } from "node:sqlite";
export function migrateTrialEnrolments(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS academy_trial_policies(academyId TEXT PRIMARY KEY REFERENCES academy_workspaces(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS academy_trial_enrolments(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),id TEXT NOT NULL,playerId TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(academyId,id));
    CREATE INDEX IF NOT EXISTS academy_trial_players ON academy_trial_enrolments(academyId,playerId);
    CREATE TABLE IF NOT EXISTS academy_trial_submissions(academyId TEXT NOT NULL,userId TEXT NOT NULL,requestId TEXT NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(academyId,userId,requestId));
  `);
}
