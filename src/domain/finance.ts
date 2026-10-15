/** Persistent academy training fees. Sportozen subscriptions use a separate boundary. */
export type FinanceStatus =
  "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED";
export type ManualPaymentMethod = "BANK_TRANSFER" | "UPI" | "CASH" | "OTHER";
export interface FinancePlan {
  id: string;
  academyId: string;
  name: string;
  amountMinor: number;
  currency: string;
  cadence: "MONTHLY" | "TERM" | "ONE_TIME";
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceInvoice {
  id: string;
  academyId: string;
  playerId: string;
  number: string;
  label: string;
  planId?: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  chargeMinor: number;
  currency: string;
  version: number;
  createdAt: string;
  issuedBy: string;
  snapshot: {
    academyName: string;
    contactEmail: string;
    logoData?: string;
    playerName: string;
  };
}
export interface FinancePayment {
  id: string;
  academyId: string;
  playerId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  reference: string;
  method: ManualPaymentMethod;
  paidOn: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  version: number;
  submittedAt: string;
  submittedBy: string;
  decisionAt?: string;
  decisionBy?: string;
  /** Staff-only reconciliation explanation. Removed from parent responses. */
  decisionNote?: string;
}
export interface FinanceAdjustment {
  id: string;
  academyId: string;
  playerId: string;
  invoiceId: string;
  direction: "CREDIT" | "DEBIT";
  amountMinor: number;
  currency: string;
  reason: string;
  approvedAt: string;
  approvedBy: string;
}
export interface FinanceReceipt {
  id: string;
  academyId: string;
  playerId: string;
  invoiceId: string;
  paymentId: string;
  number: string;
  amountMinor: number;
  currency: string;
  reference: string;
  method: ManualPaymentMethod;
  paidOn: string;
  verifiedAt: string;
  snapshot: FinanceInvoice["snapshot"] & {
    invoiceNumber: string;
    invoiceLabel: string;
    periodStart: string;
    periodEnd: string;
  };
}
export interface FinanceReminder {
  id: string;
  academyId: string;
  playerId: string;
  invoiceId: string;
  guardianIds: string[];
  body: string;
  createdAt: string;
  createdBy: string;
  inAppStatus: "PUBLISHED";
  externalStatus: "NOT_SENT";
}
export interface FinanceInvoiceView extends FinanceInvoice {
  adjustmentMinor: number;
  billedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  pendingReferenceMinor: number;
  status: FinanceStatus;
  overdue: boolean;
}
export interface FinanceSummary {
  currency: string;
  billedMinor: number;
  collectedMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  invoiceCount: number;
  paidInvoiceCount: number;
}
export interface FinancePayload {
  academyId: string;
  onlineCollection: "NOT_CONNECTED";
  canManage: boolean;
  asOfDate: string;
  plans: FinancePlan[];
  invoices: FinanceInvoiceView[];
  payments: FinancePayment[];
  adjustments: FinanceAdjustment[];
  receipts: FinanceReceipt[];
  reminders: FinanceReminder[];
  summary: FinanceSummary[];
  /** Historical unclassified records are preserved, never treated as verified invoices. */
  legacyRecords: {
    id: string;
    academyId: string;
    playerId: string;
    amountMinor: number;
    currency: string;
    label: string;
  }[];
}
export interface FinanceCommand {
  requestId: string;
  action:
    | "plan"
    | "invoice"
    | "reference"
    | "verify"
    | "reject"
    | "adjustment"
    | "reminder";
  id?: string;
  expectedVersion?: number;
  data: unknown;
}
export type FinanceActionResult =
  | FinancePlan
  | FinanceInvoice
  | FinancePayment
  | FinanceAdjustment
  | FinanceReminder;
