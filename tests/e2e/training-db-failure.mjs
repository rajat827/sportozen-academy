import { DatabaseSync } from "node:sqlite";
import { resolve, relative, isAbsolute } from "node:path";
const filename = resolve(process.env.SPORTOZEN_DATABASE_PATH ?? ""),
  local = relative(resolve(".local"), filename);
if (
  isAbsolute(local) ||
  local.startsWith("..") ||
  !/^e2e-[a-zA-Z0-9-]+\.sqlite$/.test(local)
)
  throw new Error("Synthetic test database required.");
const db = new DatabaseSync(filename);
if (process.argv[2] === "enable")
  db.exec(
    "CREATE TRIGGER qa_training_write_failure BEFORE INSERT ON training_history WHEN json_extract(NEW.body,'$.observation')='QA_DATABASE_FAILURE' BEGIN SELECT RAISE(ABORT,'Synthetic training persistence failure'); END",
  );
else if (process.argv[2] === "disable")
  db.exec("DROP TRIGGER IF EXISTS qa_training_write_failure");
else throw new Error("Unknown test action");
db.close();
