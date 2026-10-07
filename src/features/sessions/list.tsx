"use client";
import Link from "next/link";
import { CalendarDays, ArrowRight, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAcademy } from "@/hooks/use-academy";
import { Badge, Card, PageTitle } from "@/components/ui/primitives";
export function Sessions() {
  const { data } = useAcademy();
  return (
    <>
      <PageTitle
        title="Sessions"
        description="Purposeful practice, planned for the team and each player."
      >
        <Link className="button primary" href="/coach/sessions/new">
          <Plus size={16} />
          Build session
        </Link>
      </PageTitle>
      <Card>
        {data.sessions.map((s) => (
          <div className="session-list-row" key={s.id}>
            <span className="attention-icon green">
              <CalendarDays size={24} />
            </span>
            <div>
              <h3>{s.title}</h3>
              <p>
                {format(parseISO(s.date), "EEE, d MMM")} · {s.time} · {s.squad}{" "}
                · {s.venue}
              </p>
            </div>
            <Badge tone={s.status === "Draft" ? "amber" : "green"}>
              {s.status}
            </Badge>
            <Link
              className="button secondary"
              href={`/coach/sessions/${s.id}/personalise`}
            >
              Personalise
            </Link>
            <Link
              className="button primary"
              href={`/coach/sessions/${s.id}/desk`}
            >
              Open desk <ArrowRight size={15} />
            </Link>
          </div>
        ))}
      </Card>
    </>
  );
}
