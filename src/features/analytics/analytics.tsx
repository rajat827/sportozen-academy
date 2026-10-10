"use client";
import { useAcademy } from "@/hooks/use-academy";
import {
  Badge,
  Card,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
export function Analytics() {
  const { data } = useAcademy();
  const categories = [
    "Coach Reviewed",
    "Awaiting Review",
    "Unclear Footage",
    "Rejected",
  ];
  return (
    <>
      <PageTitle
        title="Academy analytics"
        description="Useful operational measures, with clear sources and missing-data states."
      />
      <div className="two-columns">
        <Card>
          <SectionTitle title="Academy operations" />
          <Metric label="Active players" value={data.players.length} max={30} />
          <Metric
            label="Sessions completed"
            value={data.sessions.filter((s) => s.status === "Completed").length}
            max={data.sessions.length}
          />
          <Metric
            label="Reports approved"
            value={data.reports.filter((r) => r.status === "Approved").length}
            max={data.reports.length}
          />
          <Metric
            label="Unmarked sessions"
            value={
              data.sessions.filter((s) =>
                data.attendance.some(
                  (a) => a.sessionId === s.id && a.status === "Unmarked",
                ),
              ).length
            }
            max={data.sessions.length}
          />
          <p className="muted">
            Retention: Not Recorded · no cohort history is available.
          </p>
          <Badge tone="blue">Calculated from demo records</Badge>
        </Card>
        <Card>
          <SectionTitle title="Evidence quality" />
          {categories.map((c) => (
            <Metric
              key={c}
              label={c}
              value={data.evidence.filter((e) => e.status === c).length}
              max={data.evidence.length}
            />
          ))}
          <p>AI estimates: 0 · no automated analysis is connected.</p>
          <Badge tone="blue">Calculated from review states</Badge>
        </Card>
        <Card>
          <SectionTitle title="Coaching workflow" />
          <Metric
            label="Goals coach verified"
            value={
              data.goals.filter((g) => g.status === "Coach Verified").length
            }
            max={data.goals.length}
          />
          <Metric
            label="Evidence captured"
            value={data.evidence.length}
            max={30}
          />
          <Metric
            label="Reports pending"
            value={data.reports.filter((r) => r.status !== "Approved").length}
            max={data.reports.length}
          />
          <p className="muted">
            Plan reviews: Not Recorded until a formal review log is added.
          </p>
        </Card>
        <Card>
          <SectionTitle title="Attendance record coverage" />
          {["Present", "Absent", "Excused", "Unmarked"].map((status) => (
            <Metric
              key={status}
              label={status}
              value={data.attendance.filter((a) => a.status === status).length}
              max={data.attendance.length}
            />
          ))}
          <p className="muted">
            Unmarked records are excluded from any attendance-rate calculation.
          </p>
        </Card>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="metric-track">
        <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
