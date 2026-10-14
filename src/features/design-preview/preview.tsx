"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  MessageSquare,
  Menu,
  CalendarDays,
  BookOpen,
  Wallet,
  Building2,
  ClipboardList,
  Settings,
} from "lucide-react";
import {
  screenCatalog,
  screenById,
  previewRoute,
  previewScenarios,
  type PreviewScenario,
  type PreviewRole,
} from "./catalog";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewAcademies, previewDrills, resolvedAcademy } from "./fixtures";
import { Button, Card, Badge, Go } from "./ui";
import { ScreenContent } from "./screens";
import { ApprovedHomes } from "./approved-homes";
import { GalleryPlayerProfile } from "./gallery-player";
import { GalleryWeeklyPlan } from "./gallery-plan";
import { GalleryOperations } from "./gallery-operations";
import { GalleryParentFrame } from "./gallery-parent-frame";
import { galleryScreenIds } from "./gallery-catalog";
import "./preview.css";
import "./gallery-workflows.css";
import "./gallery-shell.css";
const roleHome: Record<PreviewRole, string> = {
  OWNER: "owner-home",
  COACH: "coach-today",
  PARENT: "parent-home",
  PLATFORM: "platform-academies",
  ACCESS: "entry",
};
const navFor = (role: PreviewRole) =>
  role === "COACH"
    ? ([
        ["Today", "coach-today", Home],
        ["Players", "players", Users],
        ["Messages", "parent-questions", MessageSquare],
        ["More", "coach-more", Menu],
      ] as const)
    : role === "PARENT"
      ? ([
          ["Home", "parent-home", Home],
          ["Progress", "parent-progress", BookOpen],
          ["Messages", "conversations", MessageSquare],
          ["More", "parent-more", Menu],
        ] as const)
      : role === "PLATFORM"
        ? ([
            ["Customers", "platform-academies", Building2],
            ["Subscriptions", "platform-subscription", Wallet],
            ["Support", "support-access", MessageSquare],
            ["More", "platform-more", Menu],
          ] as const)
        : ([
            ["Home", "owner-home", Home],
            ["Academy", "academy-profile", Building2],
            ["Training", "weekly-plan", CalendarDays],
            ["Players", "players", Users],
            ["Fees", "fee-overview", Wallet],
            ["Messages", "delivery-states", MessageSquare],
            ["More", "owner-more", Menu],
          ] as const);
export function DesignPreview({
  screenId,
  scenario = "default",
}: {
  screenId: string;
  scenario?: PreviewScenario;
}) {
  const state = usePreviewState(),
    router = useRouter(),
    screen = screenById(screenId),
    [galleryRole, setGalleryRole] = useState<PreviewRole>("COACH"),
    [search, setSearch] = useState("");
  const role = screen?.role ?? galleryRole,
    academy = resolvedAcademy(state.academyId, state.profiles),
    name = state.profiles[academy.id]?.["Academy name"] ?? academy.name,
    gallery = scenario === "default" && galleryScreenIds.has(screenId),
    nav =
      gallery && role === "COACH"
        ? ([
            ["Home", "coach-today", Home],
            ["Calendar", "sessions", CalendarDays],
            ["Sessions", "session-agenda", ClipboardList],
            ["Players", "players", Users],
            ["Drills Library", "drill-library", BookOpen],
            ["Reports", "report-queue", ClipboardList],
            ["Messages", "parent-questions", MessageSquare],
            ["Academy", "coach-more", Building2],
            ["Settings", "coach-more", Settings],
          ] as const)
        : navFor(role),
    mobile =
      gallery && role === "COACH"
        ? nav.filter((_, i) => [0, 3, 6, 8].includes(i))
        : nav.length > 4
          ? nav.filter((_, i) => [0, 2, 5, 6].includes(i))
          : nav;
  const filter = screenCatalog.filter(
    (s) =>
      !search ||
      `${s.id} ${s.title} ${s.area} ${s.role}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const parentScopeValid =
    role !== "PARENT" ||
    state.players.some(
      (p) => p.id === state.playerId && p.guardian === "Neha Shah",
    );
  if (
    scenario === "default" &&
    parentScopeValid &&
    (screenId === "coach-today" || screenId === "parent-home")
  )
    return <ApprovedHomes parent={screenId === "parent-home"} />;
  if (gallery && screenId === "player-profile") return <GalleryPlayerProfile />;
  if (gallery && role === "PARENT" && parentScopeValid && screen)
    return (
      <GalleryParentFrame screenId={screenId} title={screen.title}>
        {screenId === "parent-weekly" ? (
          <GalleryWeeklyPlan key={`${academy.id}:${state.playerId}`} parent />
        ) : (
          <ScreenContent
            key={`${screen.id}:${academy.id}:${state.playerId}`}
            screen={screen}
            scenario={scenario}
          />
        )}
      </GalleryParentFrame>
    );
  const selectedDrill = previewDrills.find(
    (d) => d.id === (state.fields["drill-context"]?.id ?? "receive"),
  );
  const title =
    screenId === "drill-detail" && selectedDrill
      ? selectedDrill.name
      : gallery && screenId === "weekly-plan"
        ? "Weekly Plan"
        : screen?.title;
  return (
    <div
      className={`design-preview${gallery ? " gallery-prototype" : ""}`}
      data-screen={screenId}
      data-role={role}
      style={{ "--dp-green": academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to preview content
      </a>
      <div className="dp-banner">
        Design preview — fictional data; no payments or messages are processed.
      </div>
      <div className="dp-mobile-title">
        <span className="dp-monogram">{academy.monogram}</span>
        <div>
          <strong>
            {role === "PLATFORM"
              ? "Sportozen administration"
              : role === "ACCESS"
                ? "Sportozen Academy"
                : name}
          </strong>
          <small
            className="dp-note"
            style={{ color: "#c0d3e0", display: "block" }}
          >
            {role} preview
          </small>
        </div>
      </div>
      <div className="dp-shell">
        <aside className="dp-sidebar">
          <Link href={previewRoute(roleHome[role])} className="dp-brand">
            <span className="dp-monogram">
              {gallery || role === "PLATFORM" ? "S" : academy.monogram}
            </span>
            <span>
              <strong>{role === "PLATFORM" ? "Sportozen" : name}</strong>
              <small>
                {role === "PLATFORM"
                  ? "Platform administration"
                  : "Football academy · fictional"}
              </small>
            </span>
          </Link>
          <nav aria-label="Preview workspace navigation">
            {nav.map(([label, id, Icon]) => (
              <Link
                className={screenId === id ? "active" : ""}
                key={label}
                href={previewRoute(id)}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <Go to="ai-coming-soon">AI Video Analysis · Coming soon</Go>
          <footer>
            Powered by Sportozen
            <br />
            Review set · awaiting your approval
            <br />
            <Link href="/design-preview">All screens & states</Link>
            {gallery && (
              <>
                <br />
                <Link href="/design-preview/prototype">
                  Reference prototype
                </Link>
              </>
            )}
          </footer>
        </aside>
        <main id="preview-content" className="dp-main">
          <div className="dp-controls">
            <label>
              Academy fixture
              <select
                aria-label="Academy fixture"
                value={academy.id}
                onChange={(e) =>
                  previewAdapter.save({
                    academyId: e.target.value,
                    notice: "Fictional academy selected",
                  })
                }
              >
                {previewAcademies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role preview
              <select
                aria-label="Role preview"
                value={role}
                onChange={(e) => {
                  const r = e.target.value as PreviewRole;
                  setGalleryRole(r);
                  if (screen) router.push(previewRoute(roleHome[r]));
                }}
              >
                {["OWNER", "COACH", "PARENT", "PLATFORM", "ACCESS"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {role !== "ACCESS" && role !== "PLATFORM" && (
              <label>
                Player context
                <select
                  aria-label="Player context"
                  value={parentScopeValid ? state.playerId : ""}
                  onChange={(e) =>
                    previewAdapter.save({ playerId: e.target.value })
                  }
                >
                  {!parentScopeValid && (
                    <option value="">Choose a linked child</option>
                  )}
                  {(role === "PARENT"
                    ? state.players.filter((p) => p.guardian === "Neha Shah")
                    : state.players
                  ).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Design scenario
              <select
                aria-label="Design scenario"
                value={scenario}
                onChange={(e) =>
                  router.push(
                    previewRoute(
                      screenId === "gallery" ? roleHome[role] : screenId,
                      e.target.value as PreviewScenario,
                    ),
                  )
                }
              >
                {previewScenarios.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/design-preview" className="dp-gallery-link">
              Screen gallery
            </Link>
            {gallery && (
              <Link
                href="/design-preview/prototype"
                className="dp-gallery-link"
              >
                Prototype home
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                previewAdapter.reset();
                router.push("/design-preview");
              }}
            >
              Reset fictional preview
            </Button>
          </div>
          {state.notice &&
            parentScopeValid &&
            role !== "PLATFORM" &&
            role !== "ACCESS" && (
              <p className="dp-alert success" role="status">
                {state.notice}
              </p>
            )}
          {screen ? (
            <>
              <div className="dp-heading">
                <div>
                  <p className="dp-eyebrow">
                    {screen.area} / {screen.role} · {screen.id}
                  </p>
                  <h1>{title}</h1>
                  <p>{screen.description}</p>
                </div>
                <Badge>{screen.state}</Badge>
              </div>
              {scenario !== "default" && <ScenarioNotice scenario={scenario} />}
              {parentScopeValid ? (
                gallery &&
                ["weekly-plan", "parent-weekly"].includes(screenId) ? (
                  <div className="gp-workflow-content">
                    <GalleryWeeklyPlan
                      key={`${academy.id}:${state.playerId}`}
                      parent={role === "PARENT"}
                    />
                  </div>
                ) : gallery &&
                  [
                    "evidence-library",
                    "evidence-viewer",
                    "academy-analytics",
                    "report-notification",
                  ].includes(screenId) ? (
                  <div className="gp-workflow-content">
                    <GalleryOperations
                      key={`${screenId}:${academy.id}:${state.playerId}`}
                      screenId={screenId}
                    />
                  </div>
                ) : (
                  <div className={gallery ? "gp-workflow-content" : undefined}>
                    <ScreenContent
                      key={`${screen.id}:${academy.id}:${state.playerId}`}
                      screen={screen}
                      scenario={scenario}
                    />
                  </div>
                )
              ) : (
                <div className="dp-empty">
                  <h2>Select a linked child</h2>
                  <p>
                    This parent fixture only includes Neha’s children. Choose an
                    authorised child above to open their preview.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="dp-heading">
                <div>
                  <p className="dp-eyebrow">Football product review set</p>
                  <h1>One platform. Every part of the academy.</h1>
                  <p>
                    Explore {screenCatalog.length} connected screens and named
                    states. Switch academy, role and scenario without touching
                    customer records.
                  </p>
                </div>
                <Badge>Awaiting design approval</Badge>
              </div>
              <div className="dp-gallery-filter">
                <input
                  aria-label="Search screen inventory"
                  placeholder="Search screens, areas or roles"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Go to="coach-today">Start coach journey</Go>
                <Go to="onboard-identity">Start academy setup</Go>
                <Go to="parent-home">Start parent journey</Go>
              </div>
              <div className="dp-gallery">
                {filter.map((s) => (
                  <Card key={s.id}>
                    <p className="dp-id">
                      {s.id} · {s.role} · {s.area}
                    </p>
                    <h2>{s.title}</h2>
                    <p className="dp-note">{s.description}</p>
                    <Badge>{s.state}</Badge>
                    <Go to={s.id}>Open screen</Go>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      <nav className="dp-bottom" aria-label="Mobile preview navigation">
        {mobile.map(([label, id, Icon]) => (
          <Link
            key={id}
            href={previewRoute(id)}
            className={screenId === id ? "active" : ""}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
function ScenarioNotice({ scenario }: { scenario: PreviewScenario }) {
  const messages: Record<PreviewScenario, string> = {
    default: "",
    empty:
      "Design scenario: no records available. Add fictional records or return to the default view.",
    loading:
      "Design scenario: content is loading. The skeleton below is a static review state.",
    validation:
      "Design scenario: required fields need attention; labels and entered values remain visible.",
    "failed-save":
      "Design scenario: save failed. Entered values are retained for retry.",
    unsaved:
      "Design scenario: unsaved changes. Save this draft before leaving the editing task.",
    conflict:
      "Design scenario: another version was saved. Review current sources before retrying.",
    archived:
      "Design scenario: archived record. Historical detail is read-only; create a new draft separately.",
    "unavailable-media":
      "Design scenario: demonstration unavailable. Read instructions or ask the coach.",
    "pending-template":
      "Design scenario: WhatsApp template approval is pending; external delivery is unavailable.",
    "opted-out":
      "Design scenario: guardian opted out. The parent app remains available; no message is sent.",
    "delivery-failed":
      "Design scenario: simulated provider failure. Approval remains separate from this delivery result.",
  };
  return (
    <p
      className={`dp-alert ${["failed-save", "validation", "delivery-failed"].includes(scenario) ? "error" : ""}`}
      role="status"
    >
      {messages[scenario]}
    </p>
  );
}
