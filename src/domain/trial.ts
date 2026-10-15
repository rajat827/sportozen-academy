export type TrialStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED"
  | "CONVERTED"
  | "NOT_CONVERTED";
export interface TrialPolicy {
  version: number;
  defaultDurationDays: number | null;
  paidTrialsAllowed: boolean;
  defaultFeeMinor: number;
  currency: string;
  feeRuleNote: string;
}
export interface TrialSources {
  sessionIds: string[];
  attendanceIds: string[];
  evidenceIds: string[];
}
export interface TrialEnrolment {
  id: string;
  academyId: string;
  sportId: "football";
  version: number;
  playerId: string;
  squadId: string;
  coachId: string;
  startDate: string;
  endDate: string;
  status: TrialStatus;
  pricing: "FREE" | "PAID";
  feeMinor: number;
  currency: string;
  feedback: string;
  reviewedSummary?: {
    body: string;
    sourceFingerprint: string;
    reviewedBy: string;
    at: string;
  };
  publishedSummary?: {
    body: string;
    sourceFingerprint: string;
    publishedBy: string;
    at: string;
  };
  invoiceId?: string;
  createdAt: string;
  history: { status: TrialStatus; by: string; at: string; reason: string }[];
}
export interface TrialView extends TrialEnrolment {
  effectiveStatus: TrialStatus;
  sources: TrialSources;
}
export interface TrialPayload {
  policy: TrialPolicy;
  enrolments: TrialView[];
  canManage: boolean;
}
