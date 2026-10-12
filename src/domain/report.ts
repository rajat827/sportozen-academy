import type { ReportCard } from "./entities";

export interface ReportViewModel {
  brandAccent?: string;
  logoData?: string;
  labels?: Partial<ReportLabels>;
  reportId: string;
  playerId: string;
  academy: string;
  player: string;
  period: string;
  status: ReportCard["status"];
  externalDelivery: "Not sent";
  demo: boolean;
  sport?: string;
  squad?: string;
  coach?: string;
  reviewDate?: string;
  focus: string;
  reviewedReason?: string;
  practised: string;
  activities: {
    name: string;
    purpose: string;
    activity?: string;
    cue?: string;
    drillId?: string;
  }[];
  evidence: {
    text: string;
    source: string;
    reference?: string;
    headline?: string;
    label?: string;
  }[];
  nextStep: string;
  nextDrill?: string;
  observationCriteria?: string;
  note: string;
}

export interface ReportLabels {
  title: string;
  focus: string;
  practised: string;
  observed: string;
  next: string;
  closing: string;
  source: string;
  reviewPending: string;
  privacy: string;
}
export const reportLabels: ReportLabels = {
  title: "Player Development Report",
  focus: "Current development focus",
  practised: "What was practised",
  observed: "What the coach observed",
  next: "Next development step",
  closing: "Coach�s closing note",
  source: "Source",
  reviewPending: "Review date to be confirmed",
  privacy: "Private player development report",
};
