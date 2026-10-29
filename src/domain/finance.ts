/** Persistent academy training fees. Sportozen subscriptions use a separate boundary. */
export type FinanceStatus =
  "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED" | "FREE";
export type ManualPaymentMethod = "BANK_TRANSFER" | "UPI" | "CASH" | "OTHER";
export type FinanceBillingFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "WEEKLY"
  | "PER_SESSION"
  | "ONE_TIME"
  | "FREE"
  | "CUSTOM"
  | "TERM";
export const financeBillingFrequencies = [
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
  "WEEKLY",
  "PER_SESSION",
  "ONE_TIME",
  "FREE",
  "CUSTOM",
  "TERM",
] as const;
export type FinanceZeroChargeReason = "FREE" | "SCHOLARSHIP" | "WAIVER";
export interface FinanceBatchAssignment {
  id: string;
  academyId: string;
  squadId: string;
  planId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface FinancePlayerOverride {
  id: string;
  academyId: string;
  playerId: string;
  kind: "PLAN" | "DISCOUNT" | "SCHOLARSHIP" | "WAIVER";
  planId?: string;
  amountMinor?: number;
  discountBasisPoints?: number;
  discountMinor?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  reason: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceInvoiceSuggestion {
  available: boolean;
  reason: string;
  playerId: string;
  asOfDate: string;
  planId?: string;
  planVersion?: number;
  planName?: string;
  assignmentId?: string;
  assignmentVersion?: number;
  overrideId?: string;
  overrideVersion?: number;
  squadId?: string;
  billingFrequency?: FinanceBillingFrequency;
  chargeMinor?: number;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  zeroChargeReason?: FinanceZeroChargeReason;
}

export interface FinancePlan {
  id: string;
  academyId: string;
  name: string;
  amountMinor: number;
  currency: string;
  /** Retained for clients and stored plans created before billingFrequency. */
  cadence: FinanceBillingFrequency;
  billingFrequency?: FinanceBillingFrequency;
  /** Older plans have no recorded start date; never infer one from creation time. */
  applicableStartDate?: string;
  applicableEndDate?: string;
  customPeriodDays?: number;
  dueAfterDays?: number;
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
  zeroChargeReason?: FinanceZeroChargeReason;
  billingSource?: {
    kind: "BATCH_PLAN" | "PLAYER_OVERRIDE";
    planId?: string;
    planVersion?: number;
    planName?: string;
    assignmentId?: string;
    assignmentVersion?: number;
    overrideId?: string;
    overrideVersion?: number;
    squadId?: string;
    sessionId?: string;
    billingFrequency: FinanceBillingFrequency;
  };
  /** Deliberate extra charges are distinct from recurring academy fees. */
  oneTimeKey?: string;
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
  batchAssignments: FinanceBatchAssignment[];
  playerOverrides: FinancePlayerOverride[];
  invoiceSuggestions: FinanceInvoiceSuggestion[];
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
    | "batchAssignment"
    | "playerOverride"
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
  | FinanceBatchAssignment
  | FinancePlayerOverride
  | FinanceInvoice
  | FinancePayment
  | FinanceAdjustment
  | FinanceReminder;
