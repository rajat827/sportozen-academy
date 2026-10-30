# Sportozen Academy

Repository: [rajat827/sportozen-academy](https://github.com/rajat827/sportozen-academy).

## Day 1 integration branch

The local branch `codex/day1-integration` combines the four feature branches listed below on top of `a4c0869`, merged in this order: player form, quick session creation, monthly report review, configurable batch fee plans. The original feature branches are unchanged. Integration is not a claim of completed QA, visual approval or a release; the status notes below describe each branch as it was saved on 30 October 2026, and on this branch its changes are no longer separate.

## Saved development work — 30 October 2026

The latest local work is saved on separate feature branches. These branches are not merged into `main` or into one combined release. A saved branch is not a claim of completed QA or visual approval.

| Branch | Contents | Current status |
| --- | --- | --- |
| [`codex/simplify-player-form`](https://github.com/rajat827/sportozen-academy/tree/codex/simplify-player-form) | Optional football positions, configured training batches, preserved legacy placement, player tests and browser evidence | Fresh lint, typecheck and 269 unit tests passed for this save; six targeted browser cases passed earlier and were not rerun |
| [`codex/simple-session-creation`](https://github.com/rajat827/sportozen-academy/tree/codex/simple-session-creation) | Quick Create Session, unfinished drafts, saved-session navigation and recovery | Work in progress; the last browser run failed on the success banner, and subsequent fixes need a fresh build and rerun |
| [`codex/monthly-report-review`](https://github.com/rajat827/sportozen-academy/tree/codex/monthly-report-review) | Monthly review workspace, live existing report preview, source guidance and batch queue | Work in progress; serial browser verification stopped at a collapsed queue control; final PDF and mobile checks remain unverified |
| [`codex/configurable-batch-fee-plans`](https://github.com/rajat827/sportozen-academy/tree/codex/configurable-batch-fee-plans) | Finance backend for dated batch defaults, player exceptions and billing suggestions | Backend work in progress; frontend controls are not connected and typecheck reports missing new action titles |
| [`codex/settings-screen-locked-ui`](https://github.com/rajat827/sportozen-academy/tree/codex/settings-screen-locked-ui) | Preserved approved Settings preview implementation, assets, tests and audit | Separate earlier preview branch; later hardening needs fresh verification |
| [`codex/home-screen-locked-ui`](https://github.com/rajat827/sportozen-academy/tree/codex/home-screen-locked-ui) | Preserved Home implementation and browser comparison evidence | Historical feature branch; user visual approval remains separate |

The first four branches start from the professional Reports implementation at `a4c0869`, a newer descendant of `codex/academy-portal-integration`. Check out the relevant branch to inspect its source; changes on one feature branch are not automatically present on the others. Older verification documents describe their named revisions, not every later snapshot.

Local databases, account credentials, `.env` files, authentication secrets, dependencies, generated builds and raw test traces are excluded from Git. The unrelated tournament reference package remains local. Generated `next-env.d.ts` QA-path changes are also left out of these feature commits.

## Quick Create Session — saved work, 30 October 2026

Branch: `codex/simple-session-creation`, based on the newer authenticated portal descendant `a4c0869`. This snapshot preserves the six-field session form, optional draft planning/coach assignment, saved-session navigation and recovery, existing full planning editor, server rules and tests. It is saved work in progress, not a completed or approved release.

PR #14 initially failed TypeScript because confirmed-save recovery cast a generic mutation response directly to a session. Recovery now checks the saved-session response before updating the scoped view. Fresh local validation on 30 October passed lint, strict TypeScript, all 265 unit tests, the isolated production Webpack build, the dedicated Quick Create browser scenario and the existing coach session-draft regression. The browser checks confirm the saved-draft banner/navigation, interrupted request/response/refresh recovery without duplicate records, later planning and Schedule/Start rules, access scope, retained manual/Maps editing with a fake transport, and 1440/390/320 px overflow checks. No page errors or external browser requests were recorded in the Quick Create scenario. The full GitHub suite must rerun on the pushed fix.

Fresh browser captures are retained locally under ignored `.local/session-ci-20261030/screenshots/session-creation/after/`; earlier before and partial after captures remain under `docs/screenshots/session-creation/`. Functional checks and local screenshot inspection do not complete the wider requested visual QA or establish user approval. This branch remains saved work in progress.

For isolated verification, set `SPORTOZEN_QA_BUILD=1` and `SPORTOZEN_FINAL_QA=1` when building, then run `pnpm exec playwright test --config playwright.simple-session.config.ts` with matching flags. The configuration uses port 3012 and a guarded fictional database. Keep local `.local/` databases, auth secrets and traces private. The root README on [the saved Player branch](https://github.com/rajat827/sportozen-academy/tree/codex/simplify-player-form) indexes the separate branches; they have not been merged together or deployed.

One team. A different development path for every player.

A football academy portal for multiple independent customer academies. Authenticated Home, Players, Calendar, Training, Reports, Fees and Settings use academy-scoped persistent records, shared batch plans with optional personalisation, reviewed reports and private parent communication. No rankings. AI Video Analysis remains Coming soon.

The integration lineage, approved-reference selection and retained external-service limitations are in [Academy portal integration](docs/ACADEMY_PORTAL_INTEGRATION.md). Actual browser captures and reference comparisons are indexed in [portal verification](docs/ACADEMY_PORTAL_QA.md). Visual approval remains with the user.

The illustrated Reports screen and academy-branded A4 export share the existing approved report snapshot. Original football activity illustrations demonstrate activities; they are not recordings of the child. Historical snapshots, staff evidence, parent access and revision rules are retained. See [professional Reports implementation](docs/PROFESSIONAL_REPORTS.md) and [actual browser/PDF evidence](docs/screenshots/professional-reports/README.md).

## Run locally

Node.js 24 and pnpm 11 are recommended; the authenticated foundation uses native Node SQLite.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:3000. The entry leads to `/workspace`; unauthenticated visitors sign in or register at `/sign-in`. Owners create an empty academy, then configure branding, branches/batches, staff invitations, players and guardian relationships. Existing memberships open the same academy records for their permitted roles.

For the local URL used during development in this chat, run the following in PowerShell and open [http://localhost:3005/sign-in](http://localhost:3005/sign-in):

```powershell
$env:BETTER_AUTH_URL = "http://localhost:3005"
pnpm dev --port 3005
```

Keep the terminal running. If the browser reports a connection or sign-in failure, first confirm that this server is running. The browser origin and `BETTER_AUTH_URL` must agree, including host and port. When reusing an existing academy, retain its `SPORTOZEN_DATABASE_PATH` setting rather than selecting a new empty database. Local test credentials are deliberately not published; a fresh clone starts with account registration and an empty academy.

Records and sessions persist in ignored `.local/workspaces.sqlite`, unless `SPORTOZEN_DATABASE_PATH` explicitly selects another file. Keep existing databases and secrets; additive migrations preserve prior records. Production deployment requirements are documented in `docs/SECURITY_AND_DEPLOYMENT.md`.

The earlier fictional demonstrations remain separately available in development at `/owner/dashboard`, `/coach/dashboard` and `/parent/home`. Their role switch is not authentication. They and the design gallery are unavailable in a normal production build; `SPORTOZEN_GALLERY_QA=1` explicitly enables them for isolated QA.

## Football frontend design review

In development, open `/design-preview` for the retained football product review gallery. This prototype uses typed fictional academy/player fixtures and session-local state; its account, message, payment and administrative actions do not call customer APIs. Customer routes use the authenticated portal. Reset fictional preview clears only the prototype session.

The screen inventory, responsive captures, Figma capability status and future service contracts are documented in [screen map](docs/design/SCREEN_MAP.md), [work ledger](docs/design/WORK_LEDGER.md), [design system](docs/design/DESIGN_SYSTEM.md) and [backend handoff](docs/design/BACKEND_HANDOFF.md). Design awaits user approval. The Figma destination currently contains only an empty page because the authorised Starter account's MCP quota blocks authoring; it is not a completed editable review set.

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

On the Player form branch, `SPORTOZEN_PLAYER_FORM_QA=1` selects `.next-player-form-qa`. The session branch's dedicated browser configuration expects `SPORTOZEN_FINAL_QA=1`, and the Report Review branch expects `SPORTOZEN_REPORTS_QA=1`; use the same flags for build and test. These additional flags only take effect with `SPORTOZEN_QA_BUILD=1`. Other flags retain the existing Final/Gallery build directories. The dedicated commands are `pnpm exec playwright test --config playwright.simple-session.config.ts` and `pnpm exec playwright test --config playwright.report-review.config.ts` on their respective branches. Review the saved-work status above before relying on either unfinished branch.

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

## Weekly plans and monthly reports

Authenticated Training now prepares independently reviewed weekly player snapshots from recorded sessions/objectives and personal plans, without requiring a retrospective report. Reports prepares zoned monthly drafts from actual completed-session records through the existing premium preview/PDF and approval flow. Messages adds per-guardian WhatsApp jobs/status and intentionally selected replies; Settings manages verified contact/consent, disabled-by-default schedules and academy sender references. The server-only Meta Cloud API adapter, signed webhooks and persistent SQLite worker are implemented; real sending remains disabled until external setup and a controlled authorised test. See [WHATSAPP_WEEKLY_MONTHLY.md](docs/WHATSAPP_WEEKLY_MONTHLY.md) for setup, worker operation, migration/rollback and limitations. Legacy fictional demonstrations still do not send externally. AI Video Analysis — Coming soon.

## Final academy fixes and QA

Session drafts accept optional planning without requiring a drill. Fee plans have an explicit persistent Save action, currency, billing frequency and applicable start date; saving a plan never creates a charge. Optional Maps search retains the manual venue workflow and is disabled until authorised configuration. Settings supports suggested/custom session themes. Messages extends the existing approval/queue with deduplicated batch announcements and separately scheduled weekly draft preparation. Players supports academy-configurable trial enrolments, reviewed parent summaries and same-player conversion; trial invoicing is explicit and transactional.

See [final verification](docs/FINAL_ACADEMY_QA_REPORT.md), [confirmed bug causes](docs/FINAL_ACADEMY_BUG_LOG.md), [trial workflow](docs/TRIAL_ENROLMENT_WORKFLOW.md), [external setup](docs/EXTERNAL_INTEGRATION_STATUS.md) and [Bharat's isolated60-player/two-month simulation](docs/BHARAT_ACADEMY_SIMULATION.md). Live Maps/WhatsApp and online collection remain disabled or disconnected; no customer database reset, merge or deployment is included.

For the complete legacy/customer regression suite, build and test with `SPORTOZEN_QA_BUILD=1`, `SPORTOZEN_GALLERY_QA=1` and `SPORTOZEN_FINAL_QA=1`; this uses `.next-final-qa` without replacing another local build. `SPORTOZEN_E2E_EVIDENCE_ROOT` directs fresh captures away from existing evidence. The normal `pnpm build` still uses `.next`. The guarded `pnpm qa:bharat:seed` requires a fresh `.local/e2e-bharat-*.sqlite` path; `pnpm qa:bharat:verify` checks that isolated academy through authenticated browser/API/PDF routes. Synthetic credentials stay ignored under `.local/`.
