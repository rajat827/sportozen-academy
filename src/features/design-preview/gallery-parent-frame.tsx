"use client";
import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Menu,
  Bell,
} from "lucide-react";
import { previewAdapter, usePreviewState } from "./adapter";
import { previewAcademies, resolvedAcademy } from "./fixtures";
import { previewRoute, previewScenarios } from "./catalog";
import "./gallery-parent-frame.css";
export function GalleryParentFrame({
  screenId,
  title,
  children,
}: {
  screenId: string;
  title: string;
  children: ReactNode;
}) {
  const state = usePreviewState(),
    academy = resolvedAcademy(state.academyId, state.profiles),
    router = useRouter();
  return (
    <div
      className="design-preview gallery-prototype gallery-parent-frame"
      data-role="PARENT"
      data-screen={screenId}
      style={{ "--dp-green": academy.accent } as CSSProperties}
    >
      <a className="skip-link" href="#preview-content">
        Skip to preview content
      </a>
      <header className="gpf-header">
        <Link
          href={previewRoute("parent-home")}
          className="gpf-mark"
          aria-label="Parent Home"
        >
          S
        </Link>
        <select
          aria-label="Academy fixture"
          value={academy.id}
          onChange={(e) => previewAdapter.save({ academyId: e.target.value })}
        >
          {previewAcademies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <Link
          aria-label="Parent updates"
          href={previewRoute("parent-progress")}
        >
          <Bell size={19} />
        </Link>
        <details>
          <summary aria-label="Prototype context and gallery">
            <span>NS</span>
          </summary>
          <div className="gpf-menu">
            <Link href="/design-preview/prototype">Prototype home</Link>
            <Link href="/design-preview">All screens & states</Link>
            <label>
              Role preview
              <select
                aria-label="Role preview"
                value="PARENT"
                onChange={(e) =>
                  router.push(
                    previewRoute(
                      e.target.value === "COACH" ? "coach-today" : "owner-home",
                    ),
                  )
                }
              >
                <option>PARENT</option>
                <option>COACH</option>
                <option>OWNER</option>
              </select>
            </label>
            <label>
              Design scenario
              <select
                aria-label="Design scenario"
                value="default"
                onChange={(e) =>
                  router.push(
                    previewRoute(
                      screenId,
                      e.target.value as (typeof previewScenarios)[number],
                    ),
                  )
                }
              >
                {previewScenarios.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button onClick={() => previewAdapter.reset()}>
              Reset fictional preview
            </button>
          </div>
        </details>
      </header>
      <main id="preview-content" className="gpf-main">
        <Link className="gpf-back" href={previewRoute("parent-home")}>
          <ArrowLeft size={18} />
          Home
        </Link>
        <h1>{title}</h1>
        <div className="gpf-child">
          <label>
            Player context
            <select
              aria-label="Player context"
              value={state.playerId}
              onChange={(e) =>
                previewAdapter.save({ playerId: e.target.value })
              }
            >
              {state.players
                .filter((p) => p.guardian === "Neha Shah")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.category}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {state.notice && (
          <p className="dp-alert" role="status">
            {state.notice}
          </p>
        )}
        <div className="gp-workflow-content">{children}</div>
        <p className="gpf-preview-note">
          Design preview — fictional data; no payments or messages are
          processed.
        </p>
      </main>
      <nav className="gpf-bottom" aria-label="Parent navigation">
        {[
          ["Home", "parent-home", Home],
          ["Plan", "parent-weekly", CalendarDays],
          ["Progress", "parent-progress", BookOpen],
          ["Messages", "conversations", MessageSquare],
          ["More", "parent-more", Menu],
        ].map(([label, to, Icon]) => {
          const I = Icon as typeof Home;
          return (
            <Link
              key={String(to)}
              className={screenId === to ? "active" : ""}
              href={previewRoute(String(to))}
            >
              <I size={19} />
              {String(label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
