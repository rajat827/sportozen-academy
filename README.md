# Sportozen Academy

One team. A different development path for every player.

Sportozen Academy is a football academy portal for multiple independent academies. Owners, coaches and parents use one authenticated application to manage players, training batches, sessions, attendance, reviewed development reports, private parent communication and academy fees.

Repository: [rajat827/sportozen-academy](https://github.com/rajat827/sportozen-academy)

## Contents

1. [Product overview](#product-overview)
2. [Repository and integration status](#repository-and-integration-status)
3. [Core application features](#core-application-features)
4. [Owner, Coach and Parent roles](#owner-coach-and-parent-roles)
5. [Technology stack and architecture](#technology-stack-and-architecture)
6. [Prerequisites](#prerequisites)
7. [Installation and local development](#installation-and-local-development)
8. [Environment configuration and database handling](#environment-configuration-and-database-handling)
9. [Development commands](#development-commands)
10. [Unit, browser and dedicated Playwright tests](#unit-browser-and-dedicated-playwright-tests)
11. [GitHub Actions CI workflow](#github-actions-ci-workflow)
12. [Security and data boundaries](#security-and-data-boundaries)
13. [External service limitations](#external-service-limitations)
14. [Documentation index](#documentation-index)
15. [Known limitations and roadmap](#known-limitations-and-roadmap)

## Product overview

Sportozen is football-only. Each academy keeps its own records, branding, staff and families, and an account sees only the academies it belongs to. Batch training plans are the default; individual player plans are optional. Reports are built from recorded evidence and explicit coach review. Missing evidence is never shown as zero, and the product makes no rankings, comparisons between children, or predictive or medical claims.

The repository contains two separate surfaces:

| Surface                       | Routes                                                                | Data                                                 | Purpose                                 |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| Authenticated customer portal | `/sign-in`, `/workspace`, `/workspace/[academyId]`, `/platform`       | Real accounts, server sessions and a SQLite database | The product                             |
| Fictional demonstrations      | `/owner/…`, `/coach/…`, `/parent/…` and the `/design-preview` gallery | Fixed fictional data held in the browser             | Workflow and design demonstrations only |

The demonstrations' role switcher is not authentication, and they never send messages or collect money. They return 404 in a production build unless `SPORTOZEN_GALLERY_QA=1` is set for isolated QA. In development, start at `/owner/dashboard`, `/coach/dashboard` or `/parent/home`; the full route list is in [src/config/navigation/routes.ts](src/config/navigation/routes.ts).

## Repository and integration status

As of 31 October 2026:

- **`codex/day1-integration` holds the current application.** It integrates the four Day 1 feature branches (player form, Quick Create Session, Monthly report review and configurable batch fee plans) on top of the professional Reports implementation, completes their remaining work and splits the browser tests into two CI jobs. The branch is pushed to GitHub and is **not yet merged into `main`**.
- **`main` contains only a landing README.** Until the integration branch is merged, switch to `codex/day1-integration` to run the application.
- The four source feature branches are unchanged and fully contained in the integration branch. The earlier preview branches `codex/home-screen-locked-ui` and `codex/settings-screen-locked-ui` each have one commit that is not part of it.
- Lint, typecheck, unit tests, both production builds and both CI browser suites passed **locally on Windows** on 31 October 2026. That is not a GitHub Actions result; see [GitHub Actions CI workflow](#github-actions-ci-workflow).
- The application has **not been deployed**. Passing tests do not constitute visual approval, which is given separately (see [AGENTS.md](AGENTS.md) and the [UI lock](docs/design/UI_LOCK.md)).

## Core application features

| Area                       | What it covers                                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Academy setup and Settings | An Owner registers, creates an empty academy and configures branding, branches, venues, training batches, staff invitations and guardian links. Settings also covers session themes, trial rules, guardian contact and consent, and communication schedules, which are off by default. |
| Players                    | Player profiles with a training batch and an optional football position, guardian relationships, and trial enrolments that convert into the same player record.                                                                                                                        |
| Calendar and Training      | Dated batch sessions. **Quick Create Session** saves a short form as a draft; planning and coach assignment can be added later, and an interrupted save is recovered without duplicating the session. Attendance and coach-recorded evidence build on saved sessions.                  |
| Development                | Weekly player plans prepared from recorded sessions and objectives, each reviewed independently.                                                                                                                                                                                       |
| Reports                    | Monthly drafts prepared from completed-session records, a **Monthly review queue** with a live report preview, explicit approval that stores a snapshot, and an academy-branded A4 PDF that matches the on-screen report.                                                              |
| Messages                   | Private parent–staff conversations, batch announcements with a reviewed recipient list, approval before anything is published, and a per-guardian WhatsApp delivery queue that is disabled by default.                                                                                 |
| Fees                       | Fee plans, batch defaults, player exceptions, suggested invoices and a manual payment ledger. See [Fees](#fees).                                                                                                                                                                       |
| Parent views               | Home, schedule, approved reports and updates, fees and private messages for linked children only, plus **Practise together** with approved home activities.                                                                                                                            |

### Fees

Fees are a manual academy ledger. Online payment collection is **not connected**.

- **Academy fee plans** set a currency, amount, billing frequency (monthly, quarterly, half-yearly, yearly, weekly, per session, one-time, free, custom length or term) and applicable start date. Saving a plan never creates a charge.
- **Batch default plans** assign a plan to a training batch from a chosen date. **Player fee exceptions** keep the batch default or apply a different plan or amount, a discount, a credit or scholarship, or a waiver.
- **Suggested invoices** are calculated for a chosen review date. An Owner or Admin reviews and issues each one explicitly, and the server refuses duplicate invoices for a period that has already been billed.
- **One-time charges** use a one-time plan and are reviewed and issued individually.
- **Per-session plans are not suggested automatically.** Issue each session charge manually with **Issue player invoice** on the Fee Plans tab, using the session date as the billing period.
- Recorded payment references stay **Pending** until an Owner or Admin verifies them; verification produces a receipt. Invoice and receipt PDFs are private. Later plan changes never rewrite issued invoices, payments or receipts.

## Owner, Coach and Parent roles

Access is enforced on the server, not by hiding controls. Authenticated API calls and PDF exports recheck the account's current academy membership, role, football scope and player scope. [Security and deployment](docs/SECURITY_AND_DEPLOYMENT.md) records which routes the request tests cover; it is not a blanket guarantee for every older API.

| Role   | Access                                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner  | Creates the academy and manages everything in it: settings, staff and guardian invitations, players, sessions, report approval, messages, and all fee configuration, invoicing and payment verification.            |
| Coach  | Works with assigned batches and players: sessions, attendance, evidence, weekly plans, report drafting and approval after source checks, and parent conversations. Coaches have no access to fees.                  |
| Parent | Sees only their linked children: schedule, approved reports and updates, fees (read-only) and private messages with staff. Parents cannot change fee configuration and never see staff notes or unapproved records. |

Two further academy roles exist. **Admin** shares the Owner's day-to-day administration, including fees and approvals. **Support** is a limited review role; access to a child's records requires an academy-authorised, expiring and audited grant. Platform administrators use `/platform` for customer account metadata and have no academy membership by default.

## Technology stack and architecture

- **Framework:** Next.js 16.4.1 (App Router), React 19 and strict TypeScript.
- **Authentication:** Better Auth with email and password (minimum 12 characters), 8-hour sessions and database-backed rate limiting.
- **Persistence:** Node's built-in `node:sqlite` with WAL and foreign keys. Schema changes are additive migrations in [src/server/migrations](src/server/migrations), applied when the server opens the database.
- **Forms and validation:** Zod 4 and React Hook Form.
- **Interface:** Tailwind CSS 4 with shared CSS tokens, Radix dialogs, TanStack Table, Recharts, date-fns and Lucide icons.
- **Documents:** `@react-pdf/renderer` for development reports; `pdf-lib` with fontkit for invoices and receipts.
- **Testing:** Vitest and Playwright with Chromium.

A customer request flows from a portal component to a feature hook, an authenticated API route, a server application service that checks membership and scope, an academy-scoped repository and finally SQLite.

| Path                                     | Contents                                                      |
| ---------------------------------------- | ------------------------------------------------------------- |
| `src/app`                                | Routes and API route handlers                                 |
| `src/features`                           | Screens; the customer portal is in `src/features/workspaces`  |
| `src/hooks`                              | Client hooks that call the API                                |
| `src/server`                             | Authentication, database, migrations and application services |
| `src/services`                           | Rules shared by the server and the interface                  |
| `src/domain`                             | Domain types                                                  |
| `tests/unit`, `tests/e2e`                | Vitest and main Playwright suites                             |
| `tests/simulation`, `tests/professional` | Bharat simulation and professional report suites              |
| `scripts`                                | QA seeders and the communication worker                       |

See [Architecture](docs/ARCHITECTURE.md) for details.

## Prerequisites

- **Node.js 24**, the version CI uses. The application relies on Node's built-in SQLite module.
- **pnpm 11.19.0**, pinned in `package.json`. Install it directly, or use Corepack, which ships with Node.js 24 and reads the pinned version.
- **Git.**
- **Chromium for Playwright**, for browser tests: `pnpm exec playwright install chromium`.
- **Python 3.11 with pdfplumber 0.11.10**, the versions CI uses, for the report-review browser suite only.

## Installation and local development

In PowerShell:

```powershell
git clone https://github.com/rajat827/sportozen-academy.git
cd sportozen-academy
git switch codex/day1-integration   # until it is merged into main
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:3000/sign-in](http://127.0.0.1:3000/sign-in). A fresh clone has no accounts and no demonstration logins: register, then create an academy. New academies start empty.

To use another port, set the authentication origin first:

```powershell
$env:BETTER_AUTH_URL = "http://localhost:3005"
pnpm dev --port 3005
```

Then open [http://localhost:3005/sign-in](http://localhost:3005/sign-in) and keep the terminal running. `BETTER_AUTH_URL` must match the browser address exactly, including host and port, or sign-in fails.

If the page or sign-in fails, check that the server is still running, that the browser address matches `BETTER_AUTH_URL`, and that `SPORTOZEN_DATABASE_PATH` points to the same database as before. Do not delete or replace the database to troubleshoot.

## Environment configuration and database handling

Local development needs no environment variables. When you need them, set them in the environment of the process that starts the server (for example `$env:NAME = "value"` in PowerShell) or in a `.env.local` file. All `.env*` files are Git-ignored; never commit them. The repository has no `.env.example`.

| Variable                                                                                                       | Default                                  | Purpose                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SPORTOZEN_DATABASE_PATH`                                                                                      | `.local/workspaces.sqlite`               | SQLite database file                                                                                      |
| `BETTER_AUTH_URL`                                                                                              | `http://127.0.0.1:3000`                  | Public origin for authentication and mutation checks. A non-local origin must use HTTPS.                  |
| `BETTER_AUTH_SECRET`                                                                                           | Generated once into `.local/auth-secret` | Required for any non-local origin; without it the application refuses that origin with an explicit error. |
| `SPORTOZEN_GOOGLE_PLACES_ENABLED`, `SPORTOZEN_GOOGLE_PLACES_API_KEY`, `SPORTOZEN_GOOGLE_PLACES_SIGNING_SECRET` | Off                                      | Optional venue search. All three are required.                                                            |
| `SPORTOZEN_GOOGLE_PLACES_PER_USER_MINUTE`, `SPORTOZEN_GOOGLE_PLACES_PER_ACADEMY_DAY`                           | 10 and 200                               | Venue search request limits                                                                               |
| `SPORTOZEN_WHATSAPP_SEND_ENABLED`, `SPORTOZEN_WHATSAPP_LIVE_ENABLED`, `SPORTOZEN_WHATSAPP_TEST_RECIPIENTS`     | Off                                      | WhatsApp sending gates; see [WhatsApp operations](docs/WHATSAPP_WEEKLY_MONTHLY.md)                        |
| `SPORTOZEN_WA_*`                                                                                               | None                                     | Server-side WhatsApp credentials, referenced by name from academy Settings                                |

QA build and test variables are listed under [QA flags](#qa-flags).

**Database handling**

- On first start the server creates the database. Later starts apply additive migrations only, so existing records are preserved.
- The Git-ignored `.local/` folder holds the local database and its WAL files, the authentication secret, test databases and QA output. Never commit or share it.
- To keep using an existing academy, start the server with the same `SPORTOZEN_DATABASE_PATH` and the same `.local/auth-secret` every time. A new path opens an empty database; it does not lose the old one.
- Browser tests and QA seeders never use your database. They create fresh `.local/e2e-*.sqlite` files and refuse other paths.
- To back up, stop the server and copy the database file together with its `-wal` and `-shm` files. Never delete or reset the database as a troubleshooting step.

## Development commands

| Command                     | Runs                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | Development server on `http://127.0.0.1:3000`                                                                                   |
| `pnpm build`                | Production build into `.next`, or into a separate QA directory when QA flags are set                                            |
| `pnpm start`                | The last production build on `127.0.0.1`                                                                                        |
| `pnpm lint`                 | ESLint                                                                                                                          |
| `pnpm typecheck`            | TypeScript with `--noEmit`                                                                                                      |
| `pnpm test`                 | Vitest unit tests                                                                                                               |
| `pnpm test:e2e`             | The main Playwright suite                                                                                                       |
| `pnpm qa:bharat:seed`       | Seeds the isolated, synthetic Bharat simulation academy                                                                         |
| `pnpm qa:bharat:verify`     | Verifies that academy with Playwright                                                                                           |
| `pnpm communication:worker` | The persistent communication worker (add `--once` for a single run); see [WhatsApp operations](docs/WHATSAPP_WEEKLY_MONTHLY.md) |

## Unit, browser and dedicated Playwright tests

### Unit tests

`pnpm test` runs Vitest over `tests/unit`, using temporary SQLite files and synthetic records.

### Browser suites

Each Playwright configuration starts its own production server on its own port, with a fresh guarded database. Build first with the flags the suite expects: QA flags send the build to a separate directory, so an app you are already running from `.next` is left alone.

| Configuration and command                                                                                       | Runs                                                                                               | Port | Build with                                                         | CI job          |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ | --------------- |
| `playwright.config.ts`: `pnpm test:e2e`                                                                         | Every spec in `tests/e2e` except `monthly-report-review.spec.ts`                                   | 3001 | `SPORTOZEN_QA_BUILD`, `SPORTOZEN_GALLERY_QA`, `SPORTOZEN_FINAL_QA` | `validate`      |
| `playwright.report-review.config.ts`: `pnpm exec playwright test --config playwright.report-review.config.ts`   | `monthly-report-review.spec.ts`, against a fixture seeded by `scripts/qa-monthly-report-review.ts` | 3013 | `SPORTOZEN_QA_BUILD`, `SPORTOZEN_REPORTS_QA`                       | `report-review` |
| `playwright.simple-session.config.ts`: `pnpm exec playwright test --config playwright.simple-session.config.ts` | `simple-session-creation.spec.ts` on its own; it also runs in the main suite                       | 3012 | `SPORTOZEN_QA_BUILD`, `SPORTOZEN_FINAL_QA`                         | None            |
| `playwright.bharat.config.ts`: `pnpm qa:bharat:seed`, then `pnpm qa:bharat:verify`                              | `tests/simulation` against the synthetic Bharat academy                                            | 3001 | `SPORTOZEN_QA_BUILD`, `SPORTOZEN_GALLERY_QA`, `SPORTOZEN_FINAL_QA` | None            |
| `playwright.professional.config.ts`: `pnpm exec playwright test --config playwright.professional.config.ts`     | `tests/professional`                                                                               | 3004 | `SPORTOZEN_QA_BUILD`, `SPORTOZEN_REPORTS_QA`                       | None            |

Every flag above is set to `1`. The Bharat seeder requires `SPORTOZEN_DATABASE_PATH` to name a fresh `.local/e2e-bharat-*.sqlite` file. The professional configuration reads `.local/professional-report-access.json`, which no repository script creates.

### Running the CI suites locally

QA flags last for the whole PowerShell session, and a leftover flag changes the build directory. Use a new PowerShell window for each suite.

Main suite, matching the `validate` job:

```powershell
$env:SPORTOZEN_QA_BUILD = "1"
$env:SPORTOZEN_GALLERY_QA = "1"
$env:SPORTOZEN_FINAL_QA = "1"
$env:SPORTOZEN_HOME_UI_QA = "1"
$env:SPORTOZEN_E2E_EVIDENCE_ROOT = ".local/e2e-evidence"
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Report review suite, matching the `report-review` job (see the [PDF prerequisite](#pdf-qa-prerequisite) first):

```powershell
python -m pip install pdfplumber==0.11.10
$env:SPORTOZEN_QA_BUILD = "1"
$env:SPORTOZEN_REPORTS_QA = "1"
$env:SPORTOZEN_QA_PYTHON = "python"
$env:SPORTOZEN_E2E_EVIDENCE_ROOT = ".local/e2e-evidence"
pnpm build
pnpm exec playwright test --config playwright.report-review.config.ts
```

Even with these settings, `workspaces.spec.ts` and `batch-announcements.spec.ts` write some screenshots straight into `docs/screenshots/`, and QA builds rewrite `next-env.d.ts`. Check `git status` after a run and restore any file you did not mean to change with `git restore <path>`.

### QA flags

| Flag                          | Effect                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPORTOZEN_QA_BUILD=1`        | Builds into a separate directory instead of `.next`. The first matching flag picks it: `SPORTOZEN_PLAYER_FORM_QA` → `.next-player-form-qa`, `SPORTOZEN_REPORTS_QA` → `.next-professional-reports-qa`, `SPORTOZEN_FINAL_QA` → `.next-final-qa`, `SPORTOZEN_GALLERY_QA` → `.next-gallery-qa`, otherwise `.next-football-qa`. |
| `SPORTOZEN_GALLERY_QA=1`      | Enables the fictional demonstrations and design gallery in a production build.                                                                                                                                                                                                                                             |
| `SPORTOZEN_HOME_UI_QA=1`      | Writes design gallery captures to `test-results/` instead of the committed `docs/design/` folders.                                                                                                                                                                                                                         |
| `SPORTOZEN_E2E_EVIDENCE_ROOT` | Redirects most browser captures away from `docs/screenshots/`. CI uses `docs/screenshots/final-academy/regression`; locally, a Git-ignored folder such as `.local/e2e-evidence` leaves committed evidence unchanged.                                                                                                       |
| `SPORTOZEN_QA_PYTHON`         | Python interpreter with pdfplumber, for the report-review PDF check.                                                                                                                                                                                                                                                       |
| `PLAYWRIGHT_CHANNEL`          | Optional browser channel for the main and simple-session configurations.                                                                                                                                                                                                                                                   |

### PDF QA prerequisite

Case 10 of `monthly-report-review.spec.ts` exports an approved monthly report as a PDF and reads it back with pdfplumber. It needs:

1. `SPORTOZEN_QA_PYTHON` set to a Python interpreter with pdfplumber installed. Always set it: the test's fallback is a path on another developer's machine.
2. The marker file `.local/report-review-pdf-operation-started.json`, an explicit record that the PDF export operation was approved. The test fails without it. Create it deliberately, once, after reviewing the case; the CI workflow's marker step shows the fields it records.

**CI provisions both automatically.** The `report-review` job installs Python 3.11 and pdfplumber 0.11.10, sets `SPORTOZEN_QA_PYTHON=python`, and writes the marker for its isolated fictional fixture before running the suite.

## GitHub Actions CI workflow

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) ("Frontend quality gates") runs on every pull request and on pushes to `main`. Pushing a feature branch without opening a pull request does not start it. It has two independent jobs on `ubuntu-latest`:

| Job             | Steps                                                                                                                                                     | Time limit | Artefact                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------- |
| `validate`      | Frozen install, lint, typecheck, unit tests, build with the main suite's QA flags, Chromium install, `pnpm test:e2e`                                      | 30 minutes | `browser-validation`       |
| `report-review` | Python 3.11 and pdfplumber 0.11.10, frozen install, build with `SPORTOZEN_REPORTS_QA`, Chromium install, PDF marker, `playwright.report-review.config.ts` | 20 minutes | `report-review-validation` |

Together the two jobs run 75 unique browser tests across 30 spec files: 63 tests in 29 files in `validate`, and the 12 tests of `monthly-report-review.spec.ts` in `report-review`. `simple-session-creation.spec.ts` is one of the 29 files in `validate`. `playwright.simple-session.config.ts` only reruns it on its own as an additional targeted check; it adds no tests to the total and has no CI job.

Both jobs turn off Google Places and WhatsApp sending, and upload `docs/screenshots/` even when a step fails. The main configuration ignores `monthly-report-review.spec.ts` because that spec seeds its own fixture and needs the separate reports build on port 3013; running it under the main configuration failed with a refused connection.

**Status:** each job's commands passed locally on Windows on 31 October 2026. Their results on GitHub-hosted Ubuntu runners, including the Python setup, are not recorded here; check the pull request's checks.

## Security and data boundaries

- **Authentication:** Better Auth sessions, passwords of at least 12 characters, database-backed rate limiting, no session cookie caching, and secure cookies on non-local origins.
- **Authorisation:** server-side membership, role, football and player-scope checks on reads, writes and PDF exports. Parents are limited to guardian-linked children, mutation APIs require the configured origin, and API responses and PDFs are private and not cached.
- **Records:** approvals keep snapshots, and changes keep version history and audit records. Issued invoices, verified receipts and financial events are never rewritten.
- **Demonstrations:** the fictional routes are not authentication, are disabled in production builds, and their browser data is never trusted as authorisation or imported automatically.
- **Data in Git:** `.local/`, `.env*` files, databases, authentication secrets, provider credentials, real contact details and raw test traces stay out of Git. Fixtures and test data are fictional.
- **Deployment:** the application is not deployed. Its single-host SQLite setup needs a durable local disk and must not run on an ephemeral or serverless filesystem or a shared network disk. Before real children's records are admitted, [Security and deployment](docs/SECURITY_AND_DEPLOYMENT.md) requires an HTTPS origin, a strong secret, backups and monitoring, plus account recovery, staff MFA, invitation delivery, retention rules, guardian verification, consent records and an independent security review.

## External service limitations

| Service                    | Current status                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Online payment collection  | **Not connected.** Fees record manual references (bank transfer, UPI, cash or other) for Owner or Admin verification. Nothing charges, refunds or settles money.                                                                                                                                         |
| WhatsApp (Meta Cloud API)  | Adapter, delivery queue, worker, signed webhooks and private reply routing are implemented. Sending is **disabled by default** and needs per-academy setup, Meta-approved templates, verified guardian consent and server flags. Development and CI use test transports; no live send has been verified. |
| Google Places venue search | Optional and **off by default**. It needs all three server variables, and the manual venue field always works. No live Google request has been verified.                                                                                                                                                 |
| AI Video Analysis          | **Coming soon.** There is no video upload. AI suggestions in the demonstrations are static examples that need coach approval.                                                                                                                                                                            |
| Email                      | No email provider is connected. Invitation delivery and account recovery are deployment prerequisites.                                                                                                                                                                                                   |

In-app approval, publication and private messages work without any external service. See [External integration status](docs/EXTERNAL_INTEGRATION_STATUS.md) for the setup each service still needs.

## Documentation index

QA and verification records describe the revision named inside each document; they do not validate later changes.

**Start here**

- [AGENTS.md](AGENTS.md): engineering rules and product boundaries
- [Product](docs/PRODUCT.md), [Architecture](docs/ARCHITECTURE.md) and [Roadmap](docs/ROADMAP.md)
- [Security and deployment](docs/SECURITY_AND_DEPLOYMENT.md)

**Academies and accounts**

- [Independent academy workspaces](docs/MULTI_ACADEMY_FOUNDATION.md) and [migration audit](docs/WORKSPACE_MIGRATION.md)
- [Onboarding](docs/ONBOARDING.md) and [football-only release](docs/FOOTBALL_ONLY_RELEASE.md)
- [Settings](docs/SETTINGS_PORTAL_INTEGRATION.md) and [trial enrolment](docs/TRIAL_ENROLMENT_WORKFLOW.md)

**Training and reports**

- [Football training workflow](docs/FOOTBALL_SESSION_WORKFLOW.md) and [session drafts and location search](docs/SESSION_DRAFT_AND_LOCATION.md)
- [Reports](docs/REPORTS.md) and [illustrated professional reports](docs/PROFESSIONAL_REPORTS.md), with [browser and PDF evidence](docs/screenshots/professional-reports/README.md)
- [Coach and parent UX simplification](docs/UX_SIMPLIFICATION_RESULTS.md)

**Communication**

- [Communication preparation and approval](docs/COMMUNICATION.md)
- [Weekly plans, monthly reports and WhatsApp operations](docs/WHATSAPP_WEEKLY_MONTHLY.md)
- [Batch announcements](docs/BATCH_ANNOUNCEMENTS.md)
- [External integration status](docs/EXTERNAL_INTEGRATION_STATUS.md)

**Fees**

- [Academy finance](docs/ACADEMY_FINANCE.md): manual ledger, verification, PDFs and permissions. Batch default plans, exceptions and suggested invoices are summarised under [Fees](#fees) above.

**Portal integration and design**

- [Academy portal integration](docs/ACADEMY_PORTAL_INTEGRATION.md)
- [UI lock](docs/design/UI_LOCK.md) and [approved UI reference map](docs/design/UI_REFERENCE_MAP.md)
- [Concept B design system](docs/DESIGN_SYSTEM.md) and [preview design system](docs/design/DESIGN_SYSTEM.md)
- [Screen map](docs/design/SCREEN_MAP.md), [work ledger](docs/design/WORK_LEDGER.md) and [backend handoff](docs/design/BACKEND_HANDOFF.md)

**Verification records**

- [Portal verification](docs/ACADEMY_PORTAL_QA.md)
- [Final academy QA report](docs/FINAL_ACADEMY_QA_REPORT.md) and [bug log](docs/FINAL_ACADEMY_BUG_LOG.md)
- [Bharat academy simulation](docs/BHARAT_ACADEMY_SIMULATION.md)
- [Football training QA](docs/QA_REPORT.md), with [training screenshots](docs/screenshots/football-training/)
- [Verification record](docs/VALIDATION.md)

Earlier pull request descriptions, audits and extension maps remain in [docs/](docs/) as history.

## Known limitations and roadmap

**Fees**

- Suggested invoices start their billing period on the review date; there is no configurable billing anchor.
- Per-session plans are invoiced manually, and a second invoice for the same plan and session date is refused.
- A plan's currency cannot change after it is saved. Balances in different currencies are never combined or converted.
- Each one-time charge can be issued once per player.
- There is no separate surcharge type; use a player fee exception with a different amount.
- Refunds, reversals and edits to verified receipts are not supported.

**Platform**

- SQLite runs on a single host; a multi-instance deployment needs a managed database.
- The production prerequisites under [Security and data boundaries](#security-and-data-boundaries) are outstanding.
- Video upload and AI Video Analysis are not implemented.
- WhatsApp sending and Google Places search have not been verified against the live services.

**Testing and repository**

- Two browser specs still overwrite committed screenshots on local runs.
- The first GitHub-hosted run of the `report-review` job has not been confirmed.
- Visual approval of the interface is given separately from passing tests.

[Roadmap](docs/ROADMAP.md) lists remaining production work, but it also contains historical items from the original fictional demonstration experience. Check each item against the authenticated application before treating it as current.
