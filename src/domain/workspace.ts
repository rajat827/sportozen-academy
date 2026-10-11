import type { RecordBase, SportRecord } from "./entities";
import type { ReportViewModel } from "./report";
export type AcademyRole = "OWNER" | "ADMIN" | "COACH" | "PARENT" | "SUPPORT";
export interface AcademyConfiguration extends RecordBase {
  name: string;
  contactEmail: string;
  country: string;
  language: string;
  currency: string;
  timezone: string;
  dateLocale: string;
  measurementSystem: "METRIC" | "IMPERIAL";
  brandAccent: string;
  logoData?: string;
  sportIds: string[];
  legacyRecordsRestricted?: boolean;
  ageGroups: string[];
  reviewFrequency: string;
  modules: string[];
  nutritionOptional: true;
  demo: boolean;
  onboardingStatus: "CONFIGURING" | "ACTIVE";
}
export interface AcademyMembership extends RecordBase {
  userId: string;
  role: AcademyRole;
  active: boolean;
  sportIds: string[];
  expiresAt?: string;
}
export interface WorkspacePlayer extends RecordBase {
  name: string;
  sportIds: string[];
  squad: string;
  coachId: string;
}
export interface WorkspacePlan extends SportRecord {
  playerId: string;
  coachId: string;
  focus: string;
  reason: string;
  drillIds: string[];
  observe: string;
  homePractice: string;
  reviewDate: string;
  nextStep: string;
  status:
    | "DRAFT"
    | "ACTIVE"
    | "NEEDS_REVIEW"
    | "CONTINUE"
    | "ADAPT"
    | "COMPLETED"
    | "PAUSED";
  privateNote: string;
}
export interface WorkspaceReport extends SportRecord {
  playerId: string;
  planId: string;
  period: string;
  observation: string;
  evidenceType:
    | "RAW_RECORD"
    | "COACH_OBSERVATION"
    | "CALCULATED_METRIC"
    | "AI_ESTIMATE"
    | "MISSING_OR_UNCLEAR";
  nextStep: string;
  closingNote: string;
  status: "Draft" | "Approved" | "Revision Requested";
  externalDeliveryStatus: "NOT_SENT";
  snapshot?: ReportViewModel;
  approvedPlan?: Omit<WorkspacePlan, "privateNote">;
}
export interface WorkspaceDrill extends SportRecord {
  name: string;
  focusArea: string;
  purpose: string;
  cue: string;
  ownership: "ACADEMY_CURRICULUM";
  templateId?: string;
}
export interface WorkspaceBranch extends RecordBase {
  name: string;
  timezone: string;
}
export interface WorkspaceProgram extends SportRecord {
  name: string;
  branchId: string;
}
export interface WorkspaceUpdate extends SportRecord {
  playerId: string;
  planId: string;
  messageBody: string;
  sourceReportId?: string;
  type: "DEVELOPMENT" | "NUTRITION_HYDRATION";
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  inAppPublicationStatus: "UNPUBLISHED" | "PUBLISHED";
  externalDeliveryStatus: "NOT_SENT";
  version: number;
  approvedBody?: string;
  approvedSource?:
    ReportViewModel | { guideline: string; approval: "ACADEMY_APPROVED" };
  publishedGuardianIds?: string[];
}
export interface WorkspaceConversation extends RecordBase {
  guardianId: string;
  playerId: string;
  updateId?: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  messages: {
    id: string;
    senderId: string;
    senderRole: AcademyRole;
    body: string;
    at: string;
    internal: boolean;
  }[];
}
export interface WorkspaceMoney extends RecordBase {
  playerId: string;
  amountMinor: number;
  currency: string;
  label: string;
}
export interface WorkspacePreference extends RecordBase {
  userId: string;
  nutrition: boolean;
  development: boolean;
  inApp: boolean;
  language: string;
  quietStart: string;
  quietEnd: string;
  externalEnabled: false;
}
export interface WorkspaceDietaryNote extends RecordBase {
  playerId: string;
  userId: string;
  note: string;
}
export interface WorkspaceRecords {
  player: WorkspacePlayer;
  plan: WorkspacePlan;
  report: WorkspaceReport;
  drill: WorkspaceDrill;
  branch: WorkspaceBranch;
  program: WorkspaceProgram;
  update: WorkspaceUpdate;
  conversation: WorkspaceConversation;
  fee: WorkspaceMoney;
  preference: WorkspacePreference;
  dietary: WorkspaceDietaryNote;
}
export type WorkspaceKind = keyof WorkspaceRecords;
export interface WorkspacePayload {
  academy: AcademyConfiguration;
  membership: AcademyMembership;
  records: { [K in WorkspaceKind]: WorkspaceRecords[K][] };
  members: {
    userId: string;
    name: string;
    role: AcademyRole;
    active: boolean;
    id: string;
  }[];
}
