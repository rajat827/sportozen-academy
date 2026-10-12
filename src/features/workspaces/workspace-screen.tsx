"use client";
import Link from "next/link";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { navigatePrivateWorkspace } from "@/lib/private-navigation";
import { useState, useEffect } from "react";
import { useWorkspace, workspaceRequest } from "@/hooks/use-workspace";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { operationalSports } from "@/config/sports/workspace-sports";
import { ParentPreferences } from "./parent-preferences";
import { AcademyStructure } from "./academy-structure";
import { AcademyForm } from "./academy-form";
import { PlayerPlanEditor, ReportEditor, ParentPlans } from "./plan-and-report";
import { WorkspaceMessages } from "./messages";
import { ParentPractice } from "./practice";
import { FootballTraining } from "./training";
export function WorkspaceScreen({
  academyId,
  initialPlayer = "",
  initialSession = "",
}: {
  academyId: string;
  initialPlayer?: string;
  initialSession?: string;
}) {
  const [academies, setAcademies] = useState<
    { academy: { id: string; name: string } }[]
  >([]);
  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<{ workspaces: typeof academies }>(
      "/api/workspaces",
      "GET",
      undefined,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setAcademies(value.workspaces);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const w = useWorkspace(academyId),
    [selected, setSelected] = useState(initialPlayer),
    [tab, setTab] = useState("Development"),
    [trainingSection, setTrainingSection] = useState("Objectives"),
    [trainingDrill, setTrainingDrill] = useState(0),
    [trainingSession, setTrainingSession] = useState(initialSession),
    [returnToSession, setReturnToSession] = useState(false),
    [feedback, setFeedback] = useState(""),
    [name, setName] = useState(""),
    [squad, setSquad] = useState(""),
    [coach, setCoach] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("PARENT"),
    [verified, setVerified] = useState(false),
    [token, setToken] = useState("");
  function rememberSelection(key: "player" | "session", value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url.pathname + url.search);
    if (key === "player") {
      if (value !== selected) setFeedback("");
      setSelected(value);
    } else setTrainingSession(value);
  }
  if (!w.data)
    return (
      <main className="secure-workspace">
        <h1>Opening your academy</h1>
        {w.error ? (
          <p role="alert">{w.error}</p>
        ) : (
          <p>Checking membership and loading authorised records…</p>
        )}
        <Link
          href="/workspace"
          prefetch={false}
          onClick={(event) => {
            event.preventDefault();
            navigatePrivateWorkspace("/workspace");
          }}
        >
          Your academies
        </Link>
      </main>
    );
  const d = w.data,
    activeSport = "football",
    parent = d.membership.role === "PARENT",
    support = d.membership.role === "SUPPORT",
    admin = ["OWNER", "ADMIN"].includes(d.membership.role),
    players = d.records.player.filter((p) => p.sportIds.includes(activeSport)),
    player = selected
      ? players.find((p) => p.id === selected)
      : players.length === 1
        ? players[0]
        : undefined,
    configuration = operationalSports[activeSport];
  return (
    <main
      className={
        parent ? "secure-workspace parent-workspace" : "secure-workspace"
      }
      style={
        { "--workspace-accent": d.academy.brandAccent } as React.CSSProperties
      }
    >
      <header className="workspace-header">
        <div>
          <p>Sportozen Academy · Private workspace</p>
          <h1>{d.academy.name}</h1>
          <Badge>{d.membership.role}</Badge>
        </div>
        <Link
          href="/workspace"
          prefetch={false}
          onClick={(event) => {
            event.preventDefault();
            navigatePrivateWorkspace("/workspace");
          }}
        >
          Your academies
        </Link>
        {academies.length > 1 && (
          <label>
            <span>Switch academy</span>
            <select
              aria-label="Switch academy"
              value={academyId}
              onChange={(e) => {
                if (confirmUnsavedChanges())
                  navigatePrivateWorkspace(`/workspace/${e.target.value}`);
              }}
            >
              {academies.map(({ academy }) => (
                <option key={academy.id} value={academy.id}>
                  {academy.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Badge>
          {d.academy.sportIds.includes("football")
            ? "Football academy"
            : "Football configuration required"}
        </Badge>
      </header>
      <nav className="workspace-tabs" aria-label="Workspace sections">
        {[
          "Development",
          ...(!parent && !support ? ["Training"] : []),
          "Reports",
          "Messages",
          ...(parent ? ["Practise together"] : []),
          "Settings",
        ].map((t) => (
          <Button
            key={t}
            aria-label={t}
            variant={tab === t ? "primary" : "secondary"}
            onClick={() => setTab(t)}
          >
            {parent ? (
              <>
                <span className="desktop-tab-label">{t}</span>
                <span className="mobile-tab-label">
                  {t === "Development"
                    ? "Plan"
                    : t === "Practise together"
                      ? "Practise"
                      : t === "Settings"
                        ? "More"
                        : t}
                </span>
              </>
            ) : (
              t
            )}
          </Button>
        ))}
      </nav>
      {w.error && (
        <p className="notice amber" role="alert">
          {w.error}
        </p>
      )}
      {!d.academy.sportIds.includes("football") && (
        <p className="notice amber">
          Historical non-football records are preserved and restricted. An owner
          or admin can save the academy configuration to enable football. This
          does not convert historical records.
        </p>
      )}
      {d.academy.legacyRecordsRestricted &&
        d.academy.sportIds.includes("football") && (
          <p className="muted">
            Historical non-football records are preserved in restricted storage.
            This workspace shows football records only.
          </p>
        )}
      <p className="muted">
        {configuration.name} · {d.academy.timezone}
        {!parent && " · AI analysis unavailable · External messaging NOT_SENT"}
      </p>
      {tab !== "Settings" && tab !== "Training" && (
        <Card>
          <label>
            {parent ? "Your linked child" : "Player"}
            <select
              aria-label={parent ? "Your linked child" : "Player"}
              value={player?.id ?? ""}
              onChange={(e) => {
                if (confirmUnsavedChanges())
                  rememberSelection("player", e.target.value);
              }}
            >
              <option value="">Choose an authorised player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.squad}
                </option>
              ))}
            </select>
          </label>
          {player && (
            <p>
              {player.name} · {player.squad}
            </p>
          )}
          {!players.length && <p>No authorised football players yet.</p>}
          {selected && !player && (
            <p role="alert">
              The selected player is unavailable. Choose an authorised player;
              no other child has been selected.
            </p>
          )}
        </Card>
      )}
      {tab === "Training" && !parent && !support && (
        <FootballTraining
          workspace={w}
          selected={trainingSession}
          onSelect={(id) => {
            rememberSelection("session", id);
            setTrainingSection("Objectives");
            setTrainingDrill(0);
          }}
          section={trainingSection}
          onSection={setTrainingSection}
          selectedPlayer={selected}
          onSelectPlayer={(id) => rememberSelection("player", id)}
          currentDrill={trainingDrill}
          onDrill={setTrainingDrill}
          onViewPlan={(playerId) => {
            rememberSelection("player", playerId);
            setReturnToSession(true);
            setTab("Development");
          }}
        />
      )}
      {returnToSession && tab === "Development" && (
        <Button
          data-leave-editor
          variant="secondary"
          onClick={() => {
            setReturnToSession(false);
            setTab("Training");
          }}
        >
          Return to selected session
        </Button>
      )}
      {parent && player && tab === "Practise together" && (
        <ParentPractice
          key={player.id}
          workspace={w}
          player={player}
          onHelp={(body) => {
            setFeedback(body);
            setTab("Messages");
          }}
        />
      )}
      {player &&
        tab === "Development" &&
        (parent || support ? (
          <ParentPlans
            key={`${player.id}-${activeSport}`}
            workspace={w}
            player={player}
            sportId={activeSport}
          />
        ) : (
          <PlayerPlanEditor
            key={`${player.id}-${activeSport}`}
            workspace={w}
            player={player}
            sportId={activeSport}
          />
        ))}
      {player &&
        tab === "Reports" &&
        (parent || support ? (
          <ParentPlans
            workspace={w}
            player={player}
            sportId={activeSport}
            reportsOnly
          />
        ) : (
          <ReportEditor
            key={`${player.id}-${activeSport}`}
            workspace={w}
            player={player}
            sportId={activeSport}
          />
        ))}
      {player && tab === "Messages" && !support && (
        <WorkspaceMessages
          key={`${player.id}-${activeSport}`}
          workspace={w}
          player={player}
          sportId={activeSport}
          initialFeedback={feedback}
          onFeedbackSent={() => setFeedback("")}
        />
      )}
      {tab === "Settings" && (
        <>
          <Card>
            <h2>WhatsApp Business</h2>
            <Badge>NOT CONNECTED</Badge>
            <p>
              WhatsApp Business messaging is not currently connected. Approved
              messages remain saved as drafts and must be copied or shared
              manually.
            </p>
            <Button disabled>FUTURE INTEGRATION</Button>
            <p>Email, SMS and push providers are also disconnected.</p>
          </Card>
          {parent && (
            <ParentPreferences
              key={player?.id}
              workspace={w}
              playerId={player?.id}
            />
          )}
          {!parent && !support && (
            <Card>
              <h2>Add football player</h2>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const saved = await w.save("player", {
                    name,
                    squad,
                    coachId: coach || d.membership.userId,
                    sportIds: ["football"],
                  });
                  if (saved) setName("");
                }}
              >
                <label>
                  Player name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Squad
                  <input
                    required
                    value={squad}
                    onChange={(e) => setSquad(e.target.value)}
                  />
                </label>
                <label>
                  Assigned coach
                  <select
                    value={coach || d.membership.userId}
                    onChange={(e) => setCoach(e.target.value)}
                  >
                    {d.members
                      .filter(
                        (m) =>
                          m.active &&
                          ["OWNER", "ADMIN", "COACH"].includes(m.role),
                      )
                      .map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <Button disabled={w.busy}>Add player</Button>
              </form>
              {d.records.dietary.map((n) => (
                <p key={n.id}>Authorised private dietary note: {n.note}</p>
              ))}
            </Card>
          )}
          {admin && (
            <>
              <AcademyStructure workspace={w} sportId={activeSport} />
              <Card>
                <h2>Academy configuration</h2>
                <AcademyForm
                  initial={d.academy}
                  busy={w.busy}
                  onSave={w.configure}
                />
                {d.academy.demo && (
                  <Button
                    variant="secondary"
                    disabled={w.busy || !!d.records.player.length}
                    onClick={() => w.action("loadDemo")}
                  >
                    Load explicitly fictional example
                  </Button>
                )}
              </Card>
              <Card>
                <h2>Invite staff or verified guardian</h2>
                <p>
                  No invitation is sent externally. Share the single-use token
                  manually with the intended registered account.
                </p>
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const result = await w.action<{ token: string }>(
                      "invite",
                      undefined,
                      {
                        email,
                        role,
                        playerIds:
                          role === "PARENT" && player ? [player.id] : [],
                        guardianVerified: verified,
                      },
                    );
                    if (result) setToken(result.token);
                  }}
                >
                  <label>
                    Registered account email
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Academy role
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      {["PARENT", "COACH", "ADMIN"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  {role === "PARENT" && (
                    <>
                      <label>
                        Linked child
                        <select
                          value={player?.id ?? ""}
                          onChange={(e) => {
                            if (confirmUnsavedChanges())
                              rememberSelection("player", e.target.value);
                          }}
                        >
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={verified}
                          onChange={(e) => setVerified(e.target.checked)}
                        />
                        I verified this guardian’s relationship to the selected
                        child
                      </label>
                    </>
                  )}
                  <Button disabled={w.busy}>Prepare invitation</Button>
                </form>
                {token && (
                  <p className="invitation-token">
                    Manual invitation token: {token}
                  </p>
                )}
                <h3>Academy memberships</h3>
                {d.members.map((m) => (
                  <div className="list-row" key={m.id}>
                    <span>
                      {m.name} · {m.role} · {m.active ? "Active" : "Revoked"}
                    </span>
                    {m.role !== "OWNER" && m.active && (
                      <Button
                        variant="secondary"
                        onClick={() => w.action("revoke", m.id)}
                      >
                        Revoke access
                      </Button>
                    )}
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </main>
  );
}
