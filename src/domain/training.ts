import type { SportRecord } from "./entities";
import type { WorkspaceDrill } from "./workspace";
export interface TrainingRecord extends SportRecord {
  version: number;
  updatedAt: string;
  updatedBy: string;
}
export interface FootballSquad extends TrainingRecord {
  name: string;
  branchId: string;
  playerIds: string[];
}
export interface FootballVenue extends TrainingRecord {
  name: string;
  branchId: string;
  location: string;
  parentVenueId?: string;
  exclusive?: boolean;
  independentChildren?: boolean;
  bufferMinutes?: number;
}
export interface SessionObjective {
  playerId: string;
  playerName: string;
  planId?: string;
  goal: string;
  drillId: string;
  cue: string;
  observe: string;
}
export interface FootballSession extends TrainingRecord {
  branchId: string;
  squadId: string;
  venueId?: string;
  location: string;
  coachIds: string[];
  timezone: string;
  startLocal: string;
  endLocal: string;
  startAt: string;
  endAt: string;
  theme: string;
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  roster: { playerId: string; name: string }[];
  agenda: { drill: WorkspaceDrill; duration: number; drillVersion: number }[];
  objectives: SessionObjective[];
  sharedObjective?: { goal: string; cue: string; observe: string };
  preparation?: string[];
  copiedFromSessionId?: string;
}
/** Public schedule projection only; never a staff session/roster payload. */
export interface ParentScheduledSession {
  id: string;
  childId: string;
  squadId: string;
  batchName: string;
  theme: string;
  startAt: string;
  endAt: string;
  startLocal: string;
  endLocal: string;
  timezone: string;
  location: string;
  status: "SCHEDULED" | "IN_PROGRESS";
}
export interface FootballAttendance extends TrainingRecord {
  sessionId: string;
  playerId: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "UNMARKED";
  correctionReason: string;
}
export interface FootballEvidence extends TrainingRecord {
  sessionId: string;
  playerId: string;
  planId?: string;
  drillId: string;
  drillVersion: number;
  drillName: string;
  conditions: string;
  observation: string;
  staffNote: string;
  type: "COACH_OBSERVATION" | "RAW_RECORD";
  visibility: "PARENT_ELIGIBLE" | "STAFF_ONLY";
  measurement: "OBSERVATION" | "ATTEMPTS" | "ELAPSED_TIME";
  unit: "NONE" | "ATTEMPTS" | "SECONDS";
  attempts?: number;
  successes?: number;
  elapsedSeconds?: number;
  method: string;
  status:
    | "DRAFT"
    | "AWAITING_REVIEW"
    | "REVIEWED"
    | "UNCLEAR"
    | "REJECTED"
    | "SUPERSEDED";
  authorId: string;
  recordedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
export type TrainingKind =
  "squad" | "venue" | "session" | "attendance" | "evidence";
export interface TrainingRecords {
  squad: FootballSquad;
  venue: FootballVenue;
  session: FootballSession;
  attendance: FootballAttendance;
  evidence: FootballEvidence;
}
