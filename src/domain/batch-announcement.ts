export type AnnouncementKind =
  | "SESSION_CANCELLED"
  | "VENUE_CHANGED"
  | "TIME_CHANGED"
  | "ACADEMY_HOLIDAY"
  | "SPECIAL_PRACTICE"
  | "OPERATIONAL";
export interface AnnouncementDraft {
  kind: AnnouncementKind;
  urgency: "NORMAL" | "URGENT";
  batchIds: string[];
  body: string;
  expiresAt: string;
}
export interface AnnouncementRecipient {
  guardianId: string;
  phone: string;
  contactVersion: number;
  consentReference: string;
  playerIds: string[];
}
export interface AnnouncementPreview {
  eligibleCount: number;
  deduplicatedCount: number;
  excluded: { guardianId?: string; reason: string }[];
  recipients: { guardianId: string; contactEnding: string }[];
  fingerprint: string;
  renderedBody: string;
  blockers: string[];
}
export interface BatchAnnouncement extends AnnouncementDraft {
  id: string;
  academyId: string;
  version: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "QUEUED" | "CANCELLED";
  approval?: {
    reviewerId: string;
    approvedAt: string;
    fingerprint: string;
    renderedBody: string;
    templateName: string;
    recipients: AnnouncementRecipient[];
  };
}
export type AnnouncementPublic = Omit<BatchAnnouncement, "approval"> & {
  approvedAt?: string;
  recipientCount?: number;
};
export interface AnnouncementView {
  batches: { id: string; name: string; players: number }[];
  announcements: AnnouncementPublic[];
  jobs: {
    id: string;
    sourceId: string;
    guardianId: string;
    state: string;
    reason?: string;
  }[];
}
