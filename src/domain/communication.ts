import type { SportRecord } from "./entities";
import type { ReportViewModel } from "./report";
export interface ReportingPeriod {
  key: string;
  startAt: string;
  endAt: string;
  timezone: string;
}
export interface WeeklyContent {
  period: ReportingPeriod;
  playerName: string;
  teamFocus: string;
  personalFocus: string;
  observe: string;
  homePractice: string;
  sessions: {
    id: string;
    version: number;
    startAt: string;
    endAt: string;
    timezone: string;
    location: string;
  }[];
  activities: { id: string; name: string; purpose: string; cue: string }[];
  sourcePlanId?: string;
  sourcePlanVersion?: number;
  missing: string[];
}
export interface WeeklyPlan extends SportRecord {
  playerId: string;
  squadId: string;
  recordVersion?: number;
  version: number;
  content: WeeklyContent;
  authorId: string;
  status: "DRAFT" | "APPROVED" | "INVALIDATED" | "SUPERSEDED";
  snapshot?: WeeklyContent;
  reviewerId?: string;
  approvedAt?: string;
  issuedAt?: string;
  publishedGuardianIds?: string[];
  correctionOf?: string;
}
export interface MonthlySources {
  period: ReportingPeriod;
  fingerprint: string;
  sessionIds: string[];
  evidenceIds: string[];
  model: Pick<
    ReportViewModel,
    "focus" | "practised" | "activities" | "evidence"
  >;
}
export type DeliveryState =
  | "NOT_SENT"
  | "QUEUED"
  | "PROVIDER_ACCEPTED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "UNKNOWN"
  | "CANCELLED";
export type NotificationType = "WEEKLY" | "MONTHLY";
export interface CommunicationSettings {
  academyId: string;
  version: number;
  timezone: string;
  enabled: boolean;
  paused: boolean;
  weeklyDay: number;
  weeklyTime: string;
  weeklyLeadDays: number;
  monthlyDraftDay: number;
  monthlyDay: number;
  monthlyTime: string;
  quietStart: string;
  quietEnd: string;
  phoneNumberId: string;
  wabaId: string;
  credentialRef: string;
  weeklyTemplate: string;
  monthlyTemplate: string;
  language: string;
  mode: "TEST" | "LIVE";
  connection:
    | "Not configured"
    | "Awaiting provider/template setup"
    | "Ready for controlled testing"
    | "Connected"
    | "Configuration error";
  verifiedAt?: string;
}
export interface GuardianContact {
  academyId: string;
  guardianId: string;
  phone: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationReference: string;
  consentAt?: string;
  consentReference: string;
  optedOutAt?: string;
  weekly: boolean;
  monthly: boolean;
  lastInboundAt?: string;
  version: number;
}
export interface DeliveryJob {
  id: string;
  academyId: string;
  playerId: string;
  guardianId: string;
  type: NotificationType | "REPLY";
  sourceId: string;
  sourceVersion: number;
  period: string;
  correction: string;
  dueAt: string;
  expiresAt: string;
  state: DeliveryState;
  attempts: number;
  providerId?: string;
  reason?: string;
  claim?: string;
  claimedAt?: string;
}
