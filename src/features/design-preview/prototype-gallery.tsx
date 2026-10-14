"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Home,
  Users,
  CalendarDays,
  Building2,
  RotateCcw,
  Smartphone,
  Monitor,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { galleryReferences } from "./gallery-catalog";
import { previewAdapter } from "./adapter";
import "./preview.css";
import "./prototype-gallery.css";
export function PrototypeGallery() {
  const [search, setSearch] = useState(""),
    [area, setArea] = useState("All areas"),
    router = useRouter();
  const references = galleryReferences.filter(
    (r) =>
      (area === "All areas" || r.area === area) &&
      `${r.title} ${r.area} ${r.type}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="prototype-hub">
      <header>
        <Link className="ph-brand" href="/design-preview/prototype">
          <span>S</span>Sportozen <small>Academy</small>
        </Link>
        <Link href="/design-preview">All screens & states</Link>
      </header>
      <main>
        <p className="ph-eyebrow">Interactive local prototype</p>
        <h1>The academy, connected.</h1>
        <p className="ph-intro">
          The supplied football UI, built as real screens. Choose a journey,
          then explore its controls and connected views.
        </p>
        <div className="ph-journeys">
          {[
            [
              "Coach",
              "Today → players → shared plan → session → review",
              "coach-today",
              Monitor,
            ],
            [
              "Parent",
              "Home → weekly plan → report → practice → messages",
              "parent-home",
              Smartphone,
            ],
            [
              "Academy",
              "Overview → staff and academy setup → training fees",
              "owner-home",
              Building2,
            ],
          ].map(([title, note, route, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <Link href={`/design-preview/${route}`} key={String(title)}>
                <I size={26} />
                <h2>{String(title)} journey</h2>
                <p>{String(note)}</p>
                <strong>
                  Open prototype <ArrowRight size={16} />
                </strong>
              </Link>
            );
          })}
        </div>
        <div className="ph-note">
          Fictional local data. Edits persist in this browser tab’s preview
          session. Payments, account creation and WhatsApp are simulations; AI
          analysis is Coming soon.
        </div>
        <div className="ph-tools">
          <h2>Gallery reference → working screen</h2>
          <button
            type="button"
            onClick={() => {
              previewAdapter.reset();
              router.refresh();
            }}
          >
            <RotateCcw size={16} />
            Reset fictional preview
          </button>
        </div>
        <p className="ph-intro">
          The 34 supplied panels include alternate layouts and earlier concepts.
          The three main anchors guide the prototype. The images below are
          reference artwork; “Open working screen” opens the component
          implementation. Example names, scores and provider states are replaced
          with the recorded fixture data.
        </p>
        <div className="ph-filter">
          <label>
            Find a screen
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Player, report, session…"
            />
          </label>
          <label>
            Area
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option>All areas</option>
              {Array.from(new Set(galleryReferences.map((r) => r.area))).map(
                (a) => (
                  <option key={a}>{a}</option>
                ),
              )}
            </select>
          </label>
          <span role="status">{references.length} reference panels</span>
        </div>
        <div className="ph-grid">
          {references.map((r) => (
            <article key={r.number}>
              <div className="ph-card-title">
                <span>{String(r.number).padStart(2, "0")}</span>
                <div>
                  <small>
                    {r.type} · {r.area}
                  </small>
                  <h3>{r.title}</h3>
                </div>
              </div>
              <div className="ph-reference">
                <Image
                  src={`/design-preview/ui-gallery/${r.file}`}
                  width={600}
                  height={400}
                  unoptimized
                  alt={`Supplied reference: ${r.title}`}
                />
              </div>
              <div className="ph-card-links">
                <Link href={`/design-preview/${r.route}`}>
                  Open working screen <ArrowRight size={16} />
                </Link>
                <a
                  href={`/design-preview/ui-gallery/${r.file}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View reference
                </a>
              </div>
              {r.type === "Earlier concept" && (
                <p className="ph-small">
                  Current workflow uses the anchor styling and newer product
                  rules.
                </p>
              )}
              {r.type === "Report style" && (
                <p className="ph-small">
                  Reviewed records only. No universal skill scores or live QR
                  code.
                </p>
              )}
            </article>
          ))}
        </div>
        <footer>
          <Link href="/design-preview/coach-today">
            <Home size={16} />
            Coach Today
          </Link>
          <Link href="/design-preview/player-profile">
            <Users size={16} />
            Player Profile
          </Link>
          <Link href="/design-preview/parent-home">
            <Smartphone size={16} />
            Parent Home
          </Link>
          <Link href="/design-preview/weekly-plan">
            <CalendarDays size={16} />
            Weekly Plan
          </Link>
        </footer>
      </main>
    </div>
  );
}
