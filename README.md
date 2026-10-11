# Sportozen Academy

One team. A different development path for every player.

A Concept B responsive frontend for the fictional Stallions FC Academy, with owner, coach and parent experiences. Includes 24 fictional players, 2 branches, 3 coaches, 4 squads, 12 drills and connected development records.

## Run locally

Node.js 22+ and pnpm 11 are recommended.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. Use the header's Demo role switch: Owner (Anil), Coach (Rahul), Parent (Neha, linked to Aarav). No passwords or real authentication.

## Stack

Next.js 16 App Router, strict TypeScript, React 19, Tailwind 4 with shared CSS tokens, Lucide, Radix accessible sheets, TanStack Table, React Hook Form/Zod, Recharts, date-fns, Vitest and Playwright. Custom reusable UI primitives keep the academy visual identity consistent.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts the production server automatically. It covers filters, player selection, persistent goals, session drafts and reorder controls, objectives, attendance, evidence/report approval, role switching, parent privacy, navigation and overflow checks at all six requested widths. Required screenshots are saved to `docs/screenshots/`.

## Routes

Owner: `/owner/dashboard`, `/owner/academy`, `/owner/academy/branches`, `/owner/academy/programs`, `/owner/players`, `/owner/players/[playerId]`, `/owner/sessions`, `/owner/attendance`, `/owner/fees`, `/owner/communication`, `/owner/analytics`, `/owner/staff`, `/owner/settings`.

Coach: `/coach/dashboard`, `/coach/players`, `/coach/players/[playerId]`, `/coach/development/[playerId]`, `/coach/sessions`, `/coach/squads`, `/coach/sessions/new`, `/coach/sessions/[sessionId]/personalise`, `/coach/sessions/[sessionId]/desk`, `/coach/drills`, `/coach/drills/[drillId]`, `/coach/evidence`, `/coach/evidence/[evidenceId]`, `/coach/reports`, `/coach/reports/[reportId]`, `/coach/messages`.

Parent: `/parent/home`, `/parent/schedule`, `/parent/progress`, `/parent/reports`, `/parent/fees`, `/parent/messages`, `/parent/profile`.

Start the vertical slice at `/owner/players`, select Aarav (`p1`), then open development plan, personalisation (`s1`), evidence (`e1`), and report (`r1`).

## Demo limitations

Browser-only persistence is not a secure backend. Demo role switching is not authentication, and the full fictional dataset is delivered to the browser. Parent rendering excludes other players, private observations and unapproved records, but production must enforce authorisation server-side. The demo is anchored to 7 October 2026 for repeatable scenarios.

Communication supports source verification, drafts, internal review, approval/rejection, history and manual copy. Approved drafts remain internal and NOT_SENT; new drafts never appear in parent messages. No messaging provider is connected. See `docs/COMMUNICATION.md`. Payments record references only. Seeded evidence includes a playable local fictional practice animation; new observations have no video attached. Voice recording, uploads, receipts, account management, real payments, delivery and AI analysis are Not Connected. AI suggestions are static examples requiring coach approval. Reports download locally as branded A4 development PDFs with selectable text; no sharing or sending integration exists. Attendance percentage is a labelled seeded historical summary, separate from the current-session attendance ledger.

See `docs/ROADMAP.md` for remaining scope and `docs/VALIDATION.md` for verification results.

## Parent-friendly report redesign — 11 October 2026

Reports now use the same approved view model for the responsive parent/staff preview and locally generated A4 PDF. The sparse Aarav sample preserves the recorded focus, three-of-six introductory coach observation, e1 reference, next step and closing note. Missing drills and dates are not manufactured. See docs/REPORTS.md and docs/screenshots/reports for before/after evidence and export fixtures.
