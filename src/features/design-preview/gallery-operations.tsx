"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Film,
  ImageIcon,
  MessageSquare,
  FileText,
  Users,
  CalendarDays,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import { previewAdapter, usePreviewState, playerReportStatus } from "./adapter";
import { resolvedAcademy, reportFixture, weekPlanContext } from "./fixtures";
import { galleryEvidence } from "./gallery-evidence-adapter";
import { Button, Card, Badge, Head, Go, Field, Check } from "./ui";
import { previewRoute } from "./catalog";
import "./gallery-operations.css";
export function GalleryOperations({ screenId }: { screenId: string }) {
  const state = usePreviewState(),
    player = state.players.find((p) => p.id === state.playerId)!,
    academy = resolvedAcademy(state.academyId, state.profiles),
    key = `evidence:${academy.id}:${player.id}`,
    router = useRouter();
  const [note, setNote] = useState(state.fields[key]?.note ?? ""),
    [reviewed, setReviewed] = useState(
      state.fields[key]?.review === "Reviewed",
    ),
    [error, setError] = useState("");
  if (screenId === "academy-analytics") {
    const ctx = weekPlanContext(state.fields, state.players),
      present = Object.values(state.attendance).filter(
        (v) => v === "Present",
      ).length,
      absent = Object.values(state.attendance).filter(
        (v) => v === "Absent",
      ).length,
      unmarked = ctx.playerIds.filter(
        (id) => !state.attendance[id] || state.attendance[id] === "Unmarked",
      ).length;
    const cards = [
      [Users, "Players", state.players.length, "Recorded academy roster"],
      [
        CalendarDays,
        "Planned sessions",
        2,
        `${ctx.first.label} and ${ctx.second.label}`,
      ],
      [
        ClipboardCheck,
        "Marked attendance",
        present + absent,
        "Current session only",
      ],
      [
        FileText,
        "Reviewed reports",
        state.players.filter(
          (p) => playerReportStatus(state, p.id) === "Approved",
        ).length,
        "Per-player approval state",
      ],
    ] as const;
    return (
      <>
        <div className="go-summary">
          {cards.map(([Icon, title, value, label]) => (
            <Card key={title}>
              <Icon size={22} />
              <h2>{title}</h2>
              <strong>{value}</strong>
              <p className="dp-note">{label}</p>
            </Card>
          ))}
        </div>
        <div className="dp-grid">
          <Card>
            <Head
              title="Current-session attendance"
              note="No trend or improvement is inferred from one session."
            />
            {[
              ["Present", present],
              ["Absent", absent],
              ["Unmarked", unmarked],
            ].map(([label, count]) => (
              <div className="go-bar-row" key={label}>
                <span>{label}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, (Number(count) / Math.max(ctx.playerIds.length, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
            <Go to="session-attendance">Review attendance</Go>
          </Card>
          <Card>
            <Head title="Batch participation" />
            {["U10 Foundations", "U12 Development"].map((batch) => (
              <div className="dp-row" key={batch}>
                <div className="dp-copy">
                  <strong>{batch}</strong>
                  <p>
                    {state.players.filter((p) => p.batch === batch).length}{" "}
                    recorded players
                  </p>
                </div>
              </div>
            ))}
            <Go to="weekly-plan">Open shared plan</Go>
            <p className="dp-note">
              Revenue trends, goal completion percentages and talent ratings are
              not recorded.
            </p>
          </Card>
        </div>
      </>
    );
  }
  if (screenId === "report-notification") {
    const approved = playerReportStatus(state) === "Approved",
      model = reportFixture(
        academy,
        player.id,
        "default",
        state.fields[`report:${player.id}`]?.comment,
        player,
      );
    return (
      <div className="dp-grid">
        <Card>
          <Head
            title="Monthly report announcement"
            note={`${player.guardian} · ${player.name}`}
          />
          <div className="go-chat">
            <div className="go-chat-brand">
              <MessageSquare size={20} />
              <strong>{academy.name}</strong>
              <Badge>Disconnected</Badge>
            </div>
            <div className="go-message">
              <FileText size={30} />
              <h2>{player.name.split(" ")[0]}’s monthly report</h2>
              <p>{model.period}</p>
              {approved ? (
                <>
                  <p>
                    Hi {player.guardian.split(" ")[0]}, the reviewed{" "}
                    {model.period} report for {player.name} is available in the
                    parent app.
                  </p>
                  <Go to="parent-report" primary>
                    View Report
                  </Go>
                </>
              ) : (
                <p className="dp-alert">
                  This child’s report is awaiting coach review. A notification
                  cannot be prepared from an unapproved draft.
                </p>
              )}
            </div>
          </div>
          <p className="dp-note">
            Visual preview only. No provider, verification badge, delivery
            receipt or public child-report link.
          </p>
        </Card>
        <Card>
          <Head title="Before a family can be notified" />
          <p>
            Keep source review, parent access, consent, template approval and
            delivery separate.
          </p>
          <div className="dp-stack">
            <Go to="report-sources">Review report sources</Go>
            <Go to="guardian-consent">Review guardian consent</Go>
            <Go to="whatsapp-setup">Connection design</Go>
          </div>
          <Badge>No message sent</Badge>
        </Card>
      </div>
    );
  }
  const media = galleryEvidence.read(),
    metadata = state.fields[key];
  const preview = media ? (
    <div className="go-media">
      {media.type.startsWith("video/") ? (
        <video
          src={media.url}
          controls
          preload="metadata"
          aria-label={`Local video: ${media.name}`}
        />
      ) : (
        <div
          role="img"
          aria-label={`Local image: ${media.name}`}
          style={{ backgroundImage: `url("${media.url}")` }}
        />
      )}
    </div>
  ) : (
    <div className="go-media-empty">
      <Film size={38} />
      <h2>
        {metadata?.name
          ? "Select this file again to view it"
          : "No media selected"}
      </h2>
      <p>
        {metadata?.name ??
          "Choose a local image or video for this player’s preview."}
      </p>
      <small>Media stays on this computer. It is not stored on a server.</small>
    </div>
  );
  if (screenId === "evidence-library")
    return (
      <div className="dp-grid">
        <Card>
          <Head
            title={`${player.name}’s evidence`}
            note="Private local review · not a verified performance assessment"
          />
          <label className="go-upload">
            <Upload size={19} />
            Select local media
            <input
              aria-label="Select local media"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  !file.type.startsWith("image/") &&
                  !file.type.startsWith("video/")
                ) {
                  setError("Choose an image or video file.");
                  return;
                }
                galleryEvidence.attach(file);
                setReviewed(false);
                setError("");
              }}
            />
          </label>
          {error && (
            <p role="alert" className="dp-alert error">
              {error}
            </p>
          )}
          {preview}
          {metadata?.name && (
            <div className="dp-row">
              <ImageIcon size={22} />
              <div className="dp-copy">
                <strong>{metadata.name}</strong>
                <p>
                  {player.name} · {metadata.review} ·{" "}
                  {metadata.type || "Local file"}
                </p>
              </div>
              <Go to="evidence-viewer">Open evidence</Go>
            </div>
          )}
        </Card>
        <Card>
          <Head title="Coach-led review" />
          <p>
            Use the actual task conditions and a specific observation. A video
            filename or a parent check-in does not establish improvement.
          </p>
          <Go to="session-observation">Record a session observation</Go>
          <Go to="ai-coming-soon">AI Video Analysis · Coming soon</Go>
        </Card>
      </div>
    );
  return (
    <div className="dp-grid">
      <Card>
        {preview}
        <p className="dp-note">
          Local media remains available until reload. Re-select it after
          reopening the browser.
        </p>
        <Go to="evidence-library">Back to evidence library</Go>
      </Card>
      <Card>
        <Head
          title="Evidence details"
          note={`${player.name} · ${player.batch} · Maya Rao`}
        />
        <Badge>{metadata?.review ?? "Not recorded"}</Badge>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!metadata?.name) {
              setError("Select a local file before saving its review.");
              return;
            }
            if (reviewed && !note.trim()) {
              setError("Record the coaching context before marking a review.");
              return;
            }
            previewAdapter.save({
              fields: {
                ...state.fields,
                [key]: {
                  ...metadata,
                  note,
                  review: reviewed ? "Reviewed" : "Not reviewed",
                },
              },
              notice:
                "Fictional evidence note saved. No performance score or parent publication was created.",
            });
            setError("");
          }}
        >
          <Field
            label="Coach review note"
            area
            value={note}
            onChange={setNote}
          />
          <Check
            label="Coach has reviewed this local context"
            checked={reviewed}
            onChange={setReviewed}
          />
          {error && (
            <p role="alert" className="dp-alert error">
              {error}
            </p>
          )}
          <div className="dp-actions">
            <Button type="submit">Save evidence note</Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push(previewRoute("session-observation"))}
            >
              Record session observation
            </Button>
          </div>
        </form>
        <p className="dp-note">
          Reviewing a file does not publish it to parents. AI analysis is Coming
          soon.
        </p>
      </Card>
    </div>
  );
}
