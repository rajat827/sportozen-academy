"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Home,
  CalendarDays,
  Users,
  BookOpen,
  MessageSquare,
  WalletCards,
  Menu,
  Video,
  Bell,
  CircleHelp,
  Search,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewAcademies, resolvedAcademy } from "./fixtures";
import {
  previewRoute,
  previewScenarios,
  type PreviewScenario,
} from "./catalog";
import { confirmUnsavedChanges } from "@/hooks/use-unsaved-changes";
import "./home-dashboard.css";

const assets = "/design-preview/approved-home/";
const navigation = [
  ["Home", "coach-today", Home],
  ["Calendar", "sessions", CalendarDays],
  ["Players", "players", Users],
  ["Training", "weekly-plan", BookOpen],
  ["Messages", "parent-questions", MessageSquare],
  ["Reports", "report-queue", ClipboardList],
  ["Fees", "fee-overview", WalletCards],
  ["More", "coach-more", Menu],
] as const;

/** The approved Home navigation geometry, reused by scoped subsequent screens.
 * Home retains its original component to protect the verified dashboard. */
export function ApprovedWorkspaceShell({
  active,
  role = "COACH",
  scenario = "default",
  className = "",
  searchPlaceholder = "Search players, sessions, messages…",
  tools,
  children,
}: {
  active: "Home" | "Calendar" | "Fees" | "More" | "Reports";
  role?: "COACH" | "OWNER";
  scenario?: PreviewScenario;
  className?: string;
  searchPlaceholder?: string;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const state = usePreviewState(),
    router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false),
    [search, setSearch] = useState("");
  const academy = resolvedAcademy(state.academyId, state.profiles),
    profile = state.profiles[academy.id];
  const owner = role === "OWNER",
    name =
      state.fields[owner ? "owner-profile" : "coach-profile"]?.name ||
      (owner ? "Alex Morgan" : "Maya Rao"),
    initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  const routeId =
    active === "More"
      ? "academy-settings"
      : active === "Calendar"
        ? "sessions"
        : active === "Fees"
          ? "fee-overview"
          : active === "Reports"
            ? "report-queue"
            : "coach-today";
  const logo = profile?.["Logo data"];
  const identity = (
    <>
      {logo ? (
        <Image
          src={logo}
          width={54}
          height={56}
          alt={`${academy.name} logo`}
          unoptimized
        />
      ) : logo === "" ? (
        <span className="hd-crest">{academy.monogram}</span>
      ) : academy.id === "riverside" ? (
        <Image
          src={`${assets}riverside-crest.png`}
          width={54}
          height={56}
          alt="Riverside academy crest"
          unoptimized
        />
      ) : (
        <span className="hd-crest">{academy.monogram}</span>
      )}
      <span>
        <strong>{academy.name}</strong>
        <small>{profile?.Location || academy.country}</small>
      </span>
    </>
  );
  return (
    <div
      className={`design-preview home-dashboard ${className}`}
      data-screen={routeId}
      data-role={role}
      style={{ "--hd-green": academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to preview content
      </a>
      <aside className="hd-sidebar">
        <Link href={previewRoute("coach-today")} className="hd-brand">
          <Image
            src={`${assets}sportozen-mark.png`}
            width={40}
            height={48}
            alt=""
            unoptimized
          />
          <span>
            Sportozen<small>Academy</small>
          </span>
        </Link>
        <Link
          href={previewRoute(owner ? "academy-profile" : "coach-more")}
          className="hd-academy"
        >
          {identity}
        </Link>
        <nav aria-label="Preview workspace navigation">
          {navigation.map(([label, to, Icon]) => (
            <span className="hd-nav-entry" key={label}>
              {label === "Fees" && !owner ? (
                <button
                  type="button"
                  disabled
                  title="Finance is an owner workflow in this coach preview"
                >
                  <Icon size={22} />
                  {label}
                </button>
              ) : (
                <Link
                  href={previewRoute(
                    label === "More" && owner ? "owner-more" : to,
                  )}
                  className={active === label ? "active" : ""}
                  aria-current={active === label ? "page" : undefined}
                >
                  <Icon size={22} />
                  {label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <Link href={previewRoute("ai-coming-soon")} className="hd-ai">
          <span className="hd-ai-icon">
            <Video size={22} />
          </span>
          <span>
            <strong>AI Video Analysis</strong>
            <small>Coming soon</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link
          href={previewRoute(owner ? "owner-more" : "coach-more")}
          className="hd-account"
        >
          <span className="hd-avatar">{initials}</span>
          <span>
            <strong>{owner ? name : `Coach ${name.split(" ")[0]}`}</strong>
            <small>{owner ? "Owner" : "Coach"}</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      </aside>
      <div className="hd-workspace">
        <header className="hd-header">
          <form
            className="hd-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (!confirmUnsavedChanges()) return;
              const query = search.trim().toLowerCase(),
                match =
                  query &&
                  state.players.find((p) =>
                    p.name.toLowerCase().includes(query),
                  );
              if (match) {
                previewAdapter.save({ playerId: match.id });
                router.push(previewRoute("player-profile"));
              } else
                router.push(
                  previewRoute(
                    /session|calendar/.test(query)
                      ? "sessions"
                      : /message|parent/.test(query)
                        ? "parent-questions"
                        : "players",
                  ),
                );
            }}
          >
            <button type="submit" aria-label="Open player search">
              <Search size={19} />
            </button>
            <input
              aria-label="Search players, sessions, messages"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <Link
            href={previewRoute("parent-questions")}
            className="hd-header-icon"
            aria-label="Parent questions"
          >
            <Bell size={21} />
          </Link>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="hd-header-icon"
                aria-label="Search and workspace help"
              >
                <CircleHelp size={20} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content className="hd-help">
                <Dialog.Title>Workspace help</Dialog.Title>
                <Dialog.Description>
                  Search opens matching player names. Session or calendar terms
                  open Calendar; message or parent terms open Messages. Other
                  terms open Players. This is a fictional preview.
                </Dialog.Description>
                <Dialog.Close
                  className="hd-close"
                  aria-label="Close workspace help"
                >
                  <X size={20} />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Dialog.Root open={toolsOpen} onOpenChange={setToolsOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="hd-tools-trigger"
                aria-label="Preview context & screen gallery"
              >
                <span className="hd-avatar">{initials}</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hd-overlay" />
              <Dialog.Content className="hd-tools">
                <div className="hd-tools-heading">
                  <Dialog.Title>Preview tools</Dialog.Title>
                  <Dialog.Close
                    className="hd-close"
                    aria-label="Close preview tools"
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Description>
                  Fictional fixtures and review settings. No real messages or
                  payments are processed.
                </Dialog.Description>
                <label>
                  Review academy fixture
                  <select
                    aria-label="Review academy fixture"
                    value={academy.id}
                    onChange={(event) => {
                      if (confirmUnsavedChanges())
                        previewAdapter.save({ academyId: event.target.value });
                    }}
                  >
                    {previewAcademies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Player context
                  <select
                    aria-label="Player context"
                    value={state.playerId}
                    onChange={(event) => {
                      if (confirmUnsavedChanges())
                        previewAdapter.save({ playerId: event.target.value });
                    }}
                  >
                    {state.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Role preview
                  <select
                    aria-label="Role preview"
                    value={role}
                    onChange={(event) => {
                      if (!confirmUnsavedChanges()) return;
                      setToolsOpen(false);
                      router.push(
                        previewRoute(
                          event.target.value === "OWNER"
                            ? "academy-settings"
                            : event.target.value === "COACH"
                              ? "coach-today"
                              : "parent-home",
                        ),
                      );
                    }}
                  >
                    <option>OWNER</option>
                    <option>COACH</option>
                    <option>PARENT</option>
                  </select>
                </label>
                <label>
                  Design scenario
                  <select
                    aria-label="Design scenario"
                    value={scenario}
                    onChange={(event) => {
                      if (!confirmUnsavedChanges()) return;
                      setToolsOpen(false);
                      router.push(
                        previewRoute(
                          routeId,
                          event.target.value as PreviewScenario,
                        ),
                      );
                    }}
                  >
                    {previewScenarios.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                {tools}
                <Link href="/design-preview">Screen gallery</Link>
                <Link href="/design-preview/prototype">
                  Reference prototype
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmUnsavedChanges()) previewAdapter.reset();
                  }}
                >
                  Reset fictional preview
                </button>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>
        <div className="hd-mobile-academy">{identity}</div>
        <main id="preview-content" className="hd-main">
          {children}
          <p className="hd-preview-notice">
            Design preview — fictional data; no payments or messages are
            processed.
          </p>
        </main>
      </div>
      <nav className="hd-mobile-nav" aria-label="Mobile preview navigation">
        {navigation
          .filter(([label]) =>
            ["Home", "Players", "Messages", "More"].includes(label),
          )
          .map(([label, to, Icon]) => (
            <Link
              href={previewRoute(label === "More" && owner ? "owner-more" : to)}
              key={label}
              className={label === active ? "active" : ""}
              aria-current={label === active ? "page" : undefined}
            >
              <Icon size={21} />
              {label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
