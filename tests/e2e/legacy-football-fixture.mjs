// Test-only historical records. Never point this helper at a customer database.
import { DatabaseSync } from "node:sqlite";
import { resolve, relative, isAbsolute } from "node:path";
const filename = resolve(process.env.SPORTOZEN_DATABASE_PATH ?? "");
const localPath = relative(resolve(".local"), filename);
if (
  isAbsolute(localPath) ||
  localPath.startsWith("..") ||
  !/^e2e-[a-zA-Z0-9-]+\.sqlite$/.test(localPath)
)
  throw new Error(
    "Historical fixture requires an isolated .local/e2e-*.sqlite file.",
  );
const [action, academyId, coachId, guardianId] = process.argv.slice(2);
const db = new DatabaseSync(filename);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
if (action === "insert") {
  const row = db
    .prepare("SELECT config FROM academy_workspaces WHERE id=?")
    .get(academyId);
  const academy = JSON.parse(row.config);
  if (!academy.demo) throw new Error("Explicit fictional academy required.");
  academy.sportIds = ["football", "cricket", "badminton"];
  db.prepare("UPDATE academy_workspaces SET config=? WHERE id=?").run(
    JSON.stringify(academy),
    academyId,
  );
  const base = { academyId, playerId: "retired-player", sportId: "cricket" };
  const records = {
    player: {
      id: "retired-player",
      academyId,
      name: "Fictional preserved cricket child",
      sportIds: ["cricket"],
      squad: "Historical",
      coachId,
    },
    plan: {
      ...base,
      id: "retired-plan",
      coachId,
      focus: "Batting",
      reason: "Historical recorded focus",
      drillIds: ["retired-drill"],
      observe: "Historical observation",
      homePractice: "",
      reviewDate: "2026-10-25",
      nextStep: "Historical review",
      status: "ACTIVE",
      privateNote: "Historical private note",
    },
    drill: {
      ...base,
      id: "retired-drill",
      name: "Historical batting practice",
      focusArea: "Batting",
      purpose: "Historical purpose",
      cue: "Historical cue",
      ownership: "ACADEMY_CURRICULUM",
    },
    report: {
      ...base,
      id: "retired-report",
      planId: "retired-plan",
      status: "Approved",
      snapshot: {
        player: "Fictional preserved cricket child",
        sport: "Cricket",
      },
    },
    update: {
      ...base,
      id: "retired-update",
      planId: "retired-plan",
      approvalStatus: "APPROVED",
      inAppPublicationStatus: "PUBLISHED",
      publishedGuardianIds: [guardianId],
      externalDeliveryStatus: "NOT_SENT",
      messageBody: "Historical cricket message",
    },
    program: {
      ...base,
      id: "retired-program",
      name: "Historical cricket programme",
      branchId: "historical",
    },
    conversation: {
      ...base,
      id: "retired-conversation",
      guardianId,
      subject: "Historical cricket conversation",
      status: "OPEN",
      messages: [],
    },
  };
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [kind, record] of Object.entries(records))
      db.prepare(
        "INSERT INTO workspace_records(academyId,kind,id,sportId,playerId,body) VALUES(?,?,?,?,?,?)",
      ).run(
        academyId,
        kind,
        record.id,
        record.sportId ?? null,
        kind === "player" ? record.id : (record.playerId ?? null),
        JSON.stringify(record),
      );
    db.prepare(
      "INSERT INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
    ).run(academyId, guardianId, "retired-player");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
if (action === "link") {
  db.prepare(
    "INSERT OR IGNORE INTO guardian_relationships(academyId,userId,playerId) VALUES(?,?,?)",
  ).run(academyId, guardianId, "retired-player");
}
// Only synthetic record bodies, no auth/session/invitation tables.
console.log(
  JSON.stringify(
    db
      .prepare(
        "SELECT kind,id,body FROM workspace_records WHERE academyId=? AND id LIKE 'retired-%' ORDER BY kind",
      )
      .all(academyId),
  ),
);
db.close();
