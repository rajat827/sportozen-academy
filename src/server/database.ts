import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrateFootballTraining } from "./migrations/002-football-training";
import { migrateCommunications } from "./migrations/003-communications";
import { migrateAcademyFinance } from "./migrations/004-academy-finance";
import { migrateTrialEnrolments } from "./migrations/005-trial-enrolments";
import { migrateBatchAnnouncements } from "./migrations/006-batch-announcements";
import { migrateSessionPlaces } from "./migrations/007-session-places";
const connections = globalThis as typeof globalThis & {
  sportozenDatabase?: DatabaseSync;
};
export function database() {
  if (connections.sportozenDatabase) return connections.sportozenDatabase;
  const filename = resolve(
    process.env.SPORTOZEN_DATABASE_PATH ?? ".local/workspaces.sqlite",
  );
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS academy_workspaces(id TEXT PRIMARY KEY, config TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS academy_memberships(id TEXT PRIMARY KEY, academyId TEXT NOT NULL REFERENCES academy_workspaces(id), userId TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, sportIds TEXT NOT NULL DEFAULT '[]', expiresAt TEXT, UNIQUE(academyId,userId));
    CREATE TABLE IF NOT EXISTS workspace_records(academyId TEXT NOT NULL REFERENCES academy_workspaces(id), kind TEXT NOT NULL,id TEXT NOT NULL,sportId TEXT,playerId TEXT,body TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(academyId,kind,id));
    CREATE TABLE IF NOT EXISTS guardian_relationships(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),userId TEXT NOT NULL,playerId TEXT NOT NULL,PRIMARY KEY(academyId,userId,playerId));
    CREATE TABLE IF NOT EXISTS support_relationships(academyId TEXT NOT NULL REFERENCES academy_workspaces(id),userId TEXT NOT NULL,playerId TEXT NOT NULL,PRIMARY KEY(academyId,userId,playerId));
    CREATE TABLE IF NOT EXISTS workspace_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,academyId TEXT,userId TEXT NOT NULL,action TEXT NOT NULL,resourceId TEXT,at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS platform_administrators(userId TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS platform_entitlements(academyId TEXT PRIMARY KEY REFERENCES academy_workspaces(id),tier TEXT NOT NULL,modules TEXT NOT NULL,status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspace_invitations(id TEXT PRIMARY KEY,academyId TEXT NOT NULL REFERENCES academy_workspaces(id),email TEXT NOT NULL,role TEXT NOT NULL,playerIds TEXT NOT NULL,tokenHash TEXT NOT NULL UNIQUE,expiresAt TEXT NOT NULL,acceptedAt TEXT);
    CREATE TABLE IF NOT EXISTS report_approval_history(id TEXT PRIMARY KEY,academyId TEXT NOT NULL,reportId TEXT NOT NULL,snapshot TEXT NOT NULL,approvedPlan TEXT NOT NULL,approvedBy TEXT NOT NULL,at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS update_approval_history(id TEXT PRIMARY KEY,academyId TEXT NOT NULL,updateId TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,source TEXT NOT NULL,approvedBy TEXT NOT NULL,at TEXT NOT NULL);
    `);
  migrateFootballTraining(db);
  migrateCommunications(db);
  migrateAcademyFinance(db);
  migrateTrialEnrolments(db);
  migrateBatchAnnouncements(db);
  migrateSessionPlaces(db);
  connections.sportozenDatabase = db;
  return db;
}
export function atomic<T>(fn: () => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function audit(
  academyId: string | null,
  userId: string,
  action: string,
  resourceId?: string,
) {
  database()
    .prepare(
      "INSERT INTO workspace_audit(academyId,userId,action,resourceId,at) VALUES(?,?,?,?,?)",
    )
    .run(
      academyId,
      userId,
      action,
      resourceId ?? null,
      new Date().toISOString(),
    );
}
