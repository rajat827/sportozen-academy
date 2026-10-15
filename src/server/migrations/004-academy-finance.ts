import type { DatabaseSync } from "node:sqlite";

/** Additive only. Existing unclassified workspace fee records remain untouched. */
export function migrateAcademyFinance(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS academy_finance_records(
      academyId TEXT NOT NULL REFERENCES academy_workspaces(id),
      kind TEXT NOT NULL, id TEXT NOT NULL, playerId TEXT, invoiceId TEXT,
      referenceKey TEXT, paymentId TEXT, body TEXT NOT NULL,
      version INTEGER NOT NULL CHECK(version > 0),
      PRIMARY KEY(academyId,kind,id)
    );
    CREATE INDEX IF NOT EXISTS finance_player ON academy_finance_records(academyId,playerId,kind);
    CREATE UNIQUE INDEX IF NOT EXISTS finance_manual_reference ON academy_finance_records(academyId,referenceKey) WHERE kind='payment';
    CREATE UNIQUE INDEX IF NOT EXISTS finance_payment_receipt ON academy_finance_records(academyId,paymentId) WHERE kind='receipt';
    CREATE TABLE IF NOT EXISTS academy_finance_submissions(
      academyId TEXT NOT NULL, userId TEXT NOT NULL, requestId TEXT NOT NULL,
      digest TEXT NOT NULL, response TEXT NOT NULL,
      PRIMARY KEY(academyId,userId,requestId)
    );
    CREATE TABLE IF NOT EXISTS academy_finance_history(
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, academyId TEXT NOT NULL,
      kind TEXT NOT NULL, recordId TEXT NOT NULL, version INTEGER NOT NULL,
      body TEXT NOT NULL, actorId TEXT NOT NULL, at TEXT NOT NULL
    );
  `);
  if (Number(db.prepare("PRAGMA user_version").get()?.user_version) < 4)
    db.exec("PRAGMA user_version=4");
}
