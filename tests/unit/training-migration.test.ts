import { DatabaseSync } from "node:sqlite";
import { it, expect } from "vitest";
import { migrateFootballTraining } from "../../src/server/migrations/002-football-training";
it("adds training tables without changing historical customer records and can rerun", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE academy_workspaces(id TEXT PRIMARY KEY,config TEXT); INSERT INTO academy_workspaces VALUES('synthetic','unchanged'); PRAGMA user_version=1;",
  );
  migrateFootballTraining(db);
  migrateFootballTraining(db);
  expect(
    db.prepare("SELECT config FROM academy_workspaces").get()?.config,
  ).toBe("unchanged");
  expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(2);
  expect(
    db
      .prepare(
        "SELECT count(*) AS total FROM sqlite_master WHERE type='table' AND name IN ('training_history','training_submissions')",
      )
      .get()?.total,
  ).toBe(2);
  db.close();
});
it("does not downgrade a later migration version", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE academy_workspaces(id TEXT PRIMARY KEY); PRAGMA user_version=3;",
  );
  migrateFootballTraining(db);
  expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(3);
  db.close();
});
