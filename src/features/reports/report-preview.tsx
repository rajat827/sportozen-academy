import { reportLabels } from "@/domain/report";
import Image from "next/image";
import type { ReportViewModel } from "@/services/reports/report-view-model";
export function ReportPreview({ model: m }: { model: ReportViewModel }) {
  const labels = { ...reportLabels, ...m.labels };
  return (
    <article
      className="development-report"
      aria-label="Player development report"
      style={{ borderTopColor: m.brandAccent }}
    >
      <header className="development-report-header">
        <div>
          {m.logoData && (
            <Image
              src={m.logoData}
              alt={`${m.academy} logo`}
              width={120}
              height={48}
              unoptimized
              style={{ objectFit: "contain", objectPosition: "left" }}
            />
          )}
          <div className="report-academy">{m.academy}</div>
          <span className="report-attribution">Powered by Sportozen</span>
        </div>
        <div className="report-period">
          {m.period}
          <small>{m.demo ? "Fictional demo report" : "Private report"}</small>
        </div>
      </header>
      <div className="report-identity">
        <p className="report-kicker">{labels.title}</p>
        <h2>{m.player}</h2>
        <p className="report-meta">
          {[m.sport, m.squad, m.coach].filter(Boolean).join(" · ")}
        </p>
        <div className="report-status">
          <span>Report status: {m.status}</span>
          <span>External delivery: {m.externalDelivery}</span>
        </div>
      </div>
      <section className="report-focus">
        <h3>{labels.focus}</h3>
        <p>{m.focus}</p>
        {m.reviewedReason && (
          <div>
            <strong>Why this focus</strong>
            <p>{m.reviewedReason}</p>
          </div>
        )}
      </section>
      <div className="report-supporting">
        <section>
          <h3>{labels.practised}</h3>
          <p>{m.practised}</p>
          {m.activities.map((a, i) => (
            <div className="report-drill" key={i}>
              <h4>{a.name}</h4>
              <p>{a.purpose}</p>
              {a.activity && <small>{a.activity}</small>}
            </div>
          ))}
        </section>
        <section>
          <h3>{labels.observed}</h3>
          {m.evidence.length ? (
            m.evidence.map((e, i) => (
              <div className="report-evidence" key={i}>
                {e.headline && (
                  <div className="report-count">
                    {e.headline}
                    <small>introductory attempts</small>
                  </div>
                )}
                {e.label && <h4>{e.label}</h4>}
                <p>{e.text}</p>
                <div className="report-source">
                  {labels.source}: {e.source}
                </div>
                {e.reference && (
                  <details>
                    <summary>Evidence details</summary>
                    <p>Reference: {e.reference}</p>
                  </details>
                )}
              </div>
            ))
          ) : (
            <p>Reviewed evidence is awaiting confirmation.</p>
          )}
        </section>
      </div>
      <section className="report-next">
        <h3>{labels.next}</h3>
        <p>{m.nextStep}</p>
        {m.nextDrill && <p>Assigned next drill: {m.nextDrill}</p>}
        {m.observationCriteria && (
          <p>Coach will observe: {m.observationCriteria}</p>
        )}
        <div>
          {m.reviewDate ? `Review date: ${m.reviewDate}` : labels.reviewPending}
        </div>
      </section>
      {m.note && (
        <section className="report-closing">
          <h3>Coach’s closing note</h3>
          <p>{m.note}</p>
        </section>
      )}
      <footer className="development-report-footer">
        <span>
          {m.player} · {m.period}
        </span>
        <span>
          Private player development report · {m.demo && "Demo data · "}External
          delivery: {m.externalDelivery}
        </span>
      </footer>
    </article>
  );
}
