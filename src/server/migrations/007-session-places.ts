import type { DatabaseSync } from "node:sqlite";
export function migrateSessionPlaces(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS session_places_usage (
    academyId TEXT NOT NULL REFERENCES academy_workspaces(id),
    scope TEXT NOT NULL,
    bucket TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 0,
    expiresAt INTEGER NOT NULL,
    PRIMARY KEY(academyId,scope,bucket)
  );`);
}
