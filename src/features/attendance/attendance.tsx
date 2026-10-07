"use client";
import { useState } from "react";
import type { AttendanceStatus } from "@/domain/entities";
import { useAcademy } from "@/hooks/use-academy";
import {
  Avatar,
  Badge,
  Button,
  Card,
  PageTitle,
} from "@/components/ui/primitives";
export function Attendance({ sessionId }: { sessionId?: string }) {
  const { data, update } = useAcademy();
  const [selected, setSelected] = useState(sessionId ?? "s1");
  const records = data.attendance.filter((a) => a.sessionId === selected);
  const [draft, setDraft] = useState<
    Record<string, { status: AttendanceStatus; reason: string }>
  >({});
  function save() {
    update((s) => ({
      ...s,
      attendance: s.attendance.map((a) =>
        a.sessionId === selected && draft[a.id]
          ? {
              ...a,
              ...draft[a.id],
              checkIn:
                draft[a.id].status === "Present"
                  ? (a.checkIn ?? "16:00")
                  : null,
            }
          : a,
      ),
    }));
    setDraft({});
  }
  return (
    <>
      <PageTitle
        title="Attendance"
        description="Every check-in counts. Unmarked never means absent."
      >
        <Button
          variant="secondary"
          onClick={() =>
            setDraft(
              Object.fromEntries(
                records.map((a) => [a.id, { status: "Present", reason: "" }]),
              ),
            )
          }
        >
          Mark all present
        </Button>
        <Button onClick={save}>Save attendance</Button>
      </PageTitle>
      <Card>
        <label className="session-selector">
          Training session
          <select
            aria-label="Attendance session"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setDraft({});
            }}
          >
            {data.sessions.map((s) => (
              <option value={s.id} key={s.id}>
                {s.date} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <div className="notice amber">
          {
            records.filter(
              (a) => (draft[a.id]?.status ?? a.status) === "Unmarked",
            ).length
          }{" "}
          records unmarked · Save after updating attendance.
        </div>
        <div className="attendance-list">
          {records.map((a) => {
            const p = data.players.find((p) => p.id === a.playerId)!;
            const value = draft[a.id] ?? a;
            return (
              <div className="attendance-row" key={a.id}>
                <div className="player-cell">
                  <Avatar name={p.name} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.squad} ·{" "}
                      {a.checkIn
                        ? `Check-in ${a.checkIn}`
                        : "No check-in recorded"}
                    </small>
                  </span>
                </div>
                <label>
                  <span className="sr-only">Attendance for {p.name}</span>
                  <select
                    aria-label={`Attendance for ${p.name}`}
                    value={value.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [a.id]: {
                          status: e.target.value as AttendanceStatus,
                          reason: value.reason,
                        },
                      })
                    }
                  >
                    {["Present", "Absent", "Excused", "Unmarked"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <input
                  aria-label={`Attendance reason for ${p.name}`}
                  placeholder="Reason or note"
                  value={value.reason}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [a.id]: { status: value.status, reason: e.target.value },
                    })
                  }
                />
                <Badge
                  tone={
                    value.status === "Present"
                      ? "green"
                      : value.status === "Absent"
                        ? "red"
                        : "amber"
                  }
                >
                  {value.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
