import type {
  RecordBase,
  SportRecord,
  DevelopmentPlan,
  EvidenceType,
} from "./entities";
export type ProgressState =
  | "NOT_STARTED"
  | "INTRODUCED"
  | "DEVELOPING"
  | "IMPROVING"
  | "CONSISTENT"
  | "READY_FOR_NEXT_STAGE"
  | "NEEDS_MORE_EVIDENCE"
  | "NEEDS_REVIEW"
  | "COMPLETED"
  | "PAUSED";
export type PlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "NEEDS_REVIEW"
  | "CONTINUE"
  | "ADAPT"
  | "COMPLETED"
  | "PAUSED";
export interface SkillArea {
  id: string;
  name: string;
}
export interface Position {
  id: string;
  name: string;
}
export interface DrillCategory {
  id: string;
  name: string;
}
export interface DevelopmentPlanTemplate {
  id: string;
  name: string;
  focusIds: string[];
}
export interface ReportCardConfiguration {
  categories: string[];
}
export interface DrillAssignment {
  drillId: string;
  reason: string;
  cue: string;
  successCriteria: string;
  evidenceMethod: string;
}
export interface PlayerDevelopmentPlan extends DevelopmentPlan {
  focusAreas: string[];
  reason: string;
  assignments: DrillAssignment[];
  frequency: string;
  startDate: string;
  reviewDate: string;
  period: string;
  coachNotes: string;
  parentSummary: string;
  homePractice: string;
  nextGoal: string;
  progress: ProgressState;
  status: PlanStatus;
}
export type PublicPlan = Omit<PlayerDevelopmentPlan, "coachNotes">;
export interface SessionPersonalisation extends SportRecord {
  sessionId: string;
  playerId: string;
  goalId: string;
  focus: string;
  drillId: string;
  cue: string;
  evidenceMethod: string;
  reviewStatus: "NEEDS_REVIEW" | "COACH_REVIEWED";
}
export type UpdateType =
  | "NEW_DEVELOPMENT_PLAN"
  | "WEEKLY_TRAINING_FOCUS"
  | "SESSION_SUMMARY"
  | "DRILL_ASSIGNMENT"
  | "HOME_PRACTICE"
  | "PROGRESS_UPDATE"
  | "NEXT_GOAL"
  | "NUTRITION_HYDRATION"
  | "FITNESS_RECOVERY"
  | "GENERAL_COACH_UPDATE";
export interface HomePracticeGuidance extends SportRecord {
  title: string;
  body: string;
  optional: true;
}
export interface NutritionGuidance extends RecordBase {
  title: string;
  body: string;
  disclaimer: string;
  approval: "COACH_APPROVED" | "ACADEMY_APPROVED" | "NUTRITIONIST_APPROVED";
  personalised: boolean;
}
export interface ParentUpdateSource {
  id: string;
  kind: string;
  label: string;
  text: string;
  evidenceType?: EvidenceType;
}
export interface MessageApproval {
  at: string;
  actor: string;
  action: string;
  version: number;
  body: string;
  sources: ParentUpdateSource[];
  plan: PublicPlan;
}
export interface ParentDevelopmentUpdate extends SportRecord {
  playerId: string;
  guardianId: string;
  coachId: string;
  developmentPlanId: string;
  updateType: UpdateType;
  focusAreas: string[];
  assignedDrillIds: string[];
  coachReason: string;
  successCriteria: string;
  homePractice: string;
  nutritionGuidanceId: string;
  reviewDate: string;
  nextGoal: string;
  sourceRecords: ParentUpdateSource[];
  messageBody: string;
  messageVersion: number;
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  inAppPublicationStatus: "UNPUBLISHED" | "PUBLISHED" | "WITHHELD";
  externalDeliveryStatus: "NOT_SENT";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  approvalSnapshot?: MessageApproval;
  history: { at: string; actor: string; action: string; version: number }[];
}
export type ConversationTopic =
  | "PLAYER_DEVELOPMENT"
  | "DRILLS"
  | "HOME_PRACTICE"
  | "NUTRITION"
  | "ATTENDANCE"
  | "SCHEDULE"
  | "FEES"
  | "GENERAL";
export interface ConversationParticipant {
  id: string;
  role: "parent" | "coach" | "owner";
}
export interface Conversation extends RecordBase {
  playerId: string;
  guardianId: string;
  coachId: string;
  planId: string;
  updateId?: string;
  topic: ConversationTopic;
  title: string;
  status: "OPEN" | "CLOSED";
  participants: ConversationParticipant[];
  lastReadParent?: string;
  lastReadStaff?: string;
  history: { at: string; action: string; actor: string }[];
}
export interface ConversationMessage extends RecordBase {
  conversationId: string;
  body: string;
  senderId: string;
  senderRole: "parent" | "coach" | "owner";
  createdAt: string;
}
export interface InternalNote extends RecordBase {
  conversationId: string;
  body: string;
  authorId: string;
  createdAt: string;
}
export interface NotificationPreference extends RecordBase {
  attendance?: boolean;
  schedule?: boolean;
  fees?: boolean;
  guardianId: string;
  categories: Record<UpdateType, boolean>;
  inAppNotifications: boolean;
  preferredLanguage: string;
  quietStart: string;
  quietEnd: string;
  futureWhatsApp: false;
}
export interface GuardianConsent extends RecordBase {
  guardianId: string;
  inAppConsent: boolean;
  externalConsent: false;
}
export interface DietaryRestriction extends RecordBase {
  guardianId: string;
  playerId: string;
  note: string;
  updatedAt: string;
}
