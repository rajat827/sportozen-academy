# Sportozen Academy

One team. A different development path for every player.

A football-only Concept B product for multiple independent football academies. Authenticated workspaces support personalised player development, approved reports and private parent communication. No rankings. The separate fictional demonstration includes Stallions FC Academy owner, coach and parent experiences.

## Run locally

Node.js 24 and pnpm 11 are recommended; the authenticated foundation uses native Node SQLite.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000 and choose the academy, coach or parent fictional demo. No sign-in is needed for this default preview. The role switcher lets you explore each demonstration experience.

The separate authenticated training workspace remains available at `/workspace` for testing persistent academy-scoped records. Register a local test account at `/sign-in`; `/workspace` lists authorised academies and creates empty customer workspaces. Records and sessions persist in ignored `.local/workspaces.sqlite`. Use fictional records while validating this local foundation. Production deployment requirements are documented in `docs/SECURITY_AND_DEPLOYMENT.md`. Demo entry does not bypass customer authentication or expose existing academy records.

The explicitly fictional demonstration remains at `/owner/dashboard`, `/coach/dashboard` and `/parent/home`. Its header role switch selects Owner (Anil), Coach (Rahul), Parent (Neha, linked to Aarav). That demonstration switch is not authentication.

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

Playwright starts a separate production server on port 3001 with a guarded `.local/e2e-*.sqlite` database. It tests authenticated football academies in India, the UK and Australia separately from fictional demo workflows. Authenticated Training now connects squad/session objectives, attendance, coach-recorded evidence, review, approved reports and private parent updates/replies. Video upload and AI analysis remain separate work. See `docs/FOOTBALL_SESSION_WORKFLOW.md` and `docs/QA_REPORT.md`. New screenshots and an actual approved report export are saved to `docs/screenshots/football-training/`.

To verify without replacing the assets of an already running local app, set `SPORTOZEN_QA_BUILD=1` for both `pnpm build` and `pnpm test:e2e`. This uses `.next-football-qa`. No customer database reset or running-app restart is needed.

Football is assigned automatically on the server. Unsupported sport activation and creation are rejected. Historical non-football records remain unchanged in restricted storage, excluded from customer UI, APIs and PDF downloads. See `docs/FOOTBALL_ONLY_RELEASE.md` and `docs/ONBOARDING.md`.

## Routes

Authenticated: `/sign-in`, `/workspace`, `/workspace/[academyId]` and role-restricted `/platform`. Customer APIs and PDF exports check current membership server-side.

The routes below are the separate fictional demonstration:

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

## Authenticated multi-academy foundation

The authenticated customer entry is /workspace, with server-checked academy memberships, sport-specific plans, approved report snapshots and private parent messaging. Legacy role routes remain fictional demonstrations. See [MULTI_ACADEMY_FOUNDATION.md](docs/MULTI_ACADEMY_FOUNDATION.md), [SECURITY_AND_DEPLOYMENT.md](docs/SECURITY_AND_DEPLOYMENT.md) and [WORKSPACE_MIGRATION.md](docs/WORKSPACE_MIGRATION.md) for the boundary, migration audit and remaining commercial requirements. External delivery remains NOT_SENT; no real messaging, billing or AI provider is connected.

## Coach and parent UX simplification

Coach session navigation retains context and personal objectives have one editor/save. Parents have concise coach updates, private conversations and **Practise together**, using only approved linked-child activities and optional safe home practice. Feedback is an editable private message, never performance evidence. Demo route: `/parent/practice`; authenticated route: `/workspace/[academyId]` → Practise together. See [UX_SIMPLIFICATION_RESULTS.md](docs/UX_SIMPLIFICATION_RESULTS.md) for before/after evidence and separate demo/authenticated verification.
