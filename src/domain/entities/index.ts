export type Role = "owner" | "coach" | "parent";
export interface RecordBase {
  id: string;
  academyId: string;
}
export interface SportRecord extends RecordBase {
  sportId: string;
}
export interface Academy extends RecordBase {
  name: string;
  email: string;
  city: string;
  tagline: string;
}
export interface Branch extends RecordBase {
  name: string;
  address: string;
}
export interface Venue extends RecordBase {
  name: string;
  branchId: string;
}
export interface User extends RecordBase {
  name: string;
  role: Role;
}
export interface Coach extends User {
  squadIds: string[];
}
export interface Guardian extends RecordBase {
  name: string;
  playerIds: string[];
  email: string;
}
export interface Sport {
  id: string;
  name: string;
}
export interface SportConfiguration extends Sport {
  positions: string[];
  skills: string[];
  stages: string[];
  reportCategories: string[];
  sessionTerm: string;
}
export interface Program extends SportRecord {
  name: string;
  branchId: string;
}
export interface Squad extends SportRecord {
  name: string;
  coachId: string;
}
export type GoalStatus =
  | "Introduced"
  | "Developing"
  | "Consistent"
  | "Applied Under Pressure"
  | "Coach Verified";
export interface Player extends SportRecord {
  name: string;
  age: number;
  position: string;
  dominantSide: string;
  squad: string;
  branch: string;
  guardianId: string;
  attendance: number | null;
  status: "On Track" | "Review Due";
  feeStatus: "Paid" | "Outstanding";
  goal: string;
}
export interface DevelopmentGoal extends SportRecord {
  playerId: string;
  title: string;
  status: GoalStatus;
  criteria: string;
  reviewDate: string;
}
export interface DevelopmentPlan extends SportRecord {
  playerId: string;
  goalIds: string[];
  coachId: string;
  weeklyPlan: string;
}
export interface SkillStage {
  title: string;
  status: "Completed" | "In Progress" | "Not Started";
}
export interface PlayerPath extends SportRecord {
  playerId: string;
  stages: SkillStage[];
}
export interface Drill extends SportRecord {
  name: string;
  skill: string;
  ageGroup: string;
  difficulty: string;
  duration: number;
  players: string;
  equipment: string;
  objective: string;
  instructions: string[];
  coachingPoints: string[];
  progression: string;
  regression: string;
  evidenceMethod: string;
}
export interface SessionPlan extends SportRecord {
  drillIds: string[];
  focuses: Record<string, string>;
  evidencePlan: string;
  coachingPoints: string;
}
export interface Session extends SessionPlan {
  title: string;
  date: string;
  time: string;
  squad: string;
  venue: string;
  status: "Draft" | "Published" | "Completed";
}
export type AttendanceStatus = "Present" | "Absent" | "Excused" | "Unmarked";
export interface AttendanceRecord extends SportRecord {
  playerId: string;
  sessionId: string;
  status: AttendanceStatus;
  reason: string;
  checkIn: string | null;
}
export type EvidenceType =
  | "Raw Record"
  | "Coach Observation"
  | "Calculated Metric"
  | "AI Estimate"
  | "Missing / Unclear";
export type ReviewState =
  | "Awaiting Review"
  | "Coach Reviewed"
  | "Unclear Footage"
  | "Rejected"
  | "Superseded";
export interface Observation extends SportRecord {
  playerId: string;
  sessionId: string;
  note: string;
  public: boolean;
}
export interface EvidenceItem extends SportRecord {
  playerId: string;
  sessionId: string;
  goalId: string;
  title: string;
  type: EvidenceType;
  status: ReviewState;
  note: string;
  bookmarks: number[];
}
export interface ReportCardSection {
  question: string;
  answer: string;
}
export interface ReportCard extends SportRecord {
  playerId: string;
  period: string;
  coachId: string;
  status: "Draft" | "Approved" | "Revision Requested";
  sections: ReportCardSection[];
  remarks: string;
}
export interface Charge extends RecordBase {
  playerId: string;
  amount: number;
  dueDate: string;
  label: string;
}
export interface PaymentRecord extends RecordBase {
  playerId: string;
  amount: number;
  reference: string;
  date: string;
}
export interface FeeAccount extends RecordBase {
  playerId: string;
  plan: string;
}
export interface MessageDraft extends RecordBase {
  playerId: string;
  template: string;
  recipient: string;
  channel: string;
  body: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "NOT_SENT";
  deliveryStatus?: "NOT_SENT";
  relatedType?: "player" | "squad" | "session";
  relatedId?: string;
  sources?: { id: string; label: string; text: string }[];
  history?: { at: string; status: MessageDraft["status"]; action: string }[];
  parentDemo?: boolean;
  sourceVerified?: boolean;
  approvedAt?: string;
  scheduledAt: string;
}
export interface Task extends RecordBase {
  title: string;
  done: boolean;
}
export interface Notification extends RecordBase {
  title: string;
  read: boolean;
}
export interface DemoState {
  academy: Academy;
  branches: Branch[];
  venues: Venue[];
  coaches: Coach[];
  guardians: Guardian[];
  programs: Program[];
  squads: Squad[];
  players: Player[];
  goals: DevelopmentGoal[];
  plans: DevelopmentPlan[];
  paths: PlayerPath[];
  drills: Drill[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  observations: Observation[];
  evidence: EvidenceItem[];
  reports: ReportCard[];
  charges: Charge[];
  payments: PaymentRecord[];
  accounts: FeeAccount[];
  messages: MessageDraft[];
  tasks: Task[];
  notifications: Notification[];
}
