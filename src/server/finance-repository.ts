import "server-only";
import type {
  FinancePlan,
  FinanceInvoice,
  FinancePayment,
  FinanceAdjustment,
  FinanceReceipt,
  FinanceReminder,
} from "@/domain/finance";
import { database } from "./database";
import { WorkspaceError } from "./auth";

export interface FinanceRecords {
  plan: FinancePlan;
  invoice: FinanceInvoice;
  payment: FinancePayment;
  adjustment: FinanceAdjustment;
  receipt: FinanceReceipt;
  reminder: FinanceReminder;
}
export type FinanceKind = keyof FinanceRecords;
export const referenceKey = (value: string) =>
  value.normalize("NFKC").trim().toUpperCase().replace(/\s+/g, "");
export const financeRepository = {
  list<K extends FinanceKind>(academyId: string, kind: K): FinanceRecords[K][] {
    return database()
      .prepare(
        "SELECT body FROM academy_finance_records WHERE academyId=? AND kind=? ORDER BY rowid",
      )
      .all(academyId, kind)
      .map((row) => JSON.parse(String(row.body)) as FinanceRecords[K]);
  },
  find<K extends FinanceKind>(
    academyId: string,
    kind: K,
    id: string,
  ): FinanceRecords[K] | undefined {
    const row = database()
      .prepare(
        "SELECT body FROM academy_finance_records WHERE academyId=? AND kind=? AND id=?",
      )
      .get(academyId, kind, id);
    return row
      ? (JSON.parse(String(row.body)) as FinanceRecords[K])
      : undefined;
  },
  save<K extends FinanceKind>(
    academyId: string,
    kind: K,
    record: FinanceRecords[K],
    expectedVersion: number,
    actorId: string,
  ) {
    if (record.academyId !== academyId)
      throw new WorkspaceError(403, "Finance record ownership mismatch.");
    const row = database()
      .prepare(
        "SELECT version FROM academy_finance_records WHERE academyId=? AND kind=? AND id=?",
      )
      .get(academyId, kind, record.id);
    if (Number(row?.version ?? 0) !== expectedVersion)
      throw new WorkspaceError(
        409,
        "Finance record changed. Reload and review before retrying.",
      );
    if (row && !["plan", "invoice", "payment"].includes(kind))
      throw new WorkspaceError(
        409,
        "Issued finance events and documents are immutable.",
      );
    const version = expectedVersion + 1;
    const body = "version" in record ? { ...record, version } : record;
    database()
      .prepare(
        `INSERT INTO academy_finance_records(academyId,kind,id,playerId,invoiceId,referenceKey,paymentId,body,version)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(academyId,kind,id) DO UPDATE SET body=excluded.body,version=excluded.version`,
      )
      .run(
        academyId,
        kind,
        record.id,
        "playerId" in record ? record.playerId : null,
        kind === "invoice"
          ? record.id
          : "invoiceId" in record
            ? record.invoiceId
            : null,
        kind === "payment"
          ? referenceKey((record as FinancePayment).reference)
          : null,
        kind === "receipt" ? (record as FinanceReceipt).paymentId : null,
        JSON.stringify(body),
        version,
      );
    database()
      .prepare(
        "INSERT INTO academy_finance_history(academyId,kind,recordId,version,body,actorId,at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        academyId,
        kind,
        record.id,
        version,
        JSON.stringify(body),
        actorId,
        new Date().toISOString(),
      );
    return body as FinanceRecords[K];
  },
};
