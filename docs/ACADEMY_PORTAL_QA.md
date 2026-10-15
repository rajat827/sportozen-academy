# Authenticated Academy portal verification

15 October 2026. Branch: `codex/academy-portal-integration`, based on `d20f1a7`. This implements the existing application; it does not replace customer records with the design-preview adapter. Reference selection was confirmed by the user. Visual implementation approval remains pending.

## Local entry and routes

Open `http://127.0.0.1:3000/workspace`. Sign-in leads to the authenticated user's authorised academies. A newly created academy starts empty. The user-requested local dummy account has its own explicitly labelled empty demo academy; its credentials are retained only under ignored `.local/` and shared directly with the user, never committed.

Within `/workspace/[academyId]`, the `section` query selects `home`, `players`, `calendar`, `training`, `reports`, `fees`, `settings`, `messages`, `development` or `practice`. Canonical player/session/report source IDs stay in URL context and are checked against server-authorised records. Parent navigation is Home, Progress, Messages, More.

The preserved seven-screen capture academy is isolated synthetic QA data. Its actual routes and IDs are recorded in [capture.json](screenshots/academy-portal/capture.json). Owner, coach and parent share those underlying persisted records. The user's existing database was backed up before reopening the local server; no customer reset or fixture loading occurred.

## Checks

| Check | Result and evidence |
| --- | --- |
| Full ESLint | Passed; later bounded TSX/test edits also passed scoped ESLint. |
| Unit tests | 175 passed across 20 files. Includes persistent finance, rollback/retries/current permissions, shared scheduling, batch-only reports/updates, source privacy and actual-font document wrapping. |
| Production build | Final build completed successfully with regenerated Next TypeScript validation. Separate `.next-gallery-qa` output and guarded synthetic database preserve normal local assets/data. |
| Main authenticated portal | Passed on final build: onboarding, correct canonical navigation, weekly approval/publication, monthly approval/private PDF, manual reference/verification/receipt, failed-save recovery, role/child isolation and persistence after two server restarts. No browser page errors or external requests. |
| Batch-only monthly report and update | Passed: no individual plan created; approved snapshot/PDF, exact Reports-to-Messages source, Back/Forward, mandatory verified update approval, private publication, parent reads and NOT_SENT. |
| Settings | Passed: six widths, staged PNG, validation, confirmed save/reload, injected failed-save retention, actual HTTP409 conflict review, Back/Forward/discard, venue/zone creation and permission boundaries. |
| Onboarding | Passed: typed categories, invalid PNG rejection, real gated FileReader, blocked premature submit, failed-create retention and one confirmed empty academy. |
| Regional weekly/monthly workflows | Passed for India, UK and Australia, including approved private report/PDF, exact source links, opt-in/forbidden-child boundaries and truthful disconnected provider status. |
| Existing authenticated workspace regression | Passed: separate academies and children, approved/private records, conversations/preferences and persistence. |
| Calendar/Training interaction regression | Passed in full: Week/Month/Agenda and filters, overlaps, same-ID reschedule and late-event reveal, real conflict draft retention, attendance, second-child plan/Evidence return and invalid-child rejection, draft copy, cancellation/history, and batch-only weekly plans. |
| Preserved frontend previews | Two focused regressions passed: keyboard-contained mobile details/unsaved private notes, and Home/Players/Profile/Parent Home with no customer business API calls. |

The first seven-case coordinated run passed five cases; its failures were exact accessible-locator adaptations in the older regional and scheduling tests. A subsequent four-case run passed the regional and both preview cases. Scheduling's further failures were a descendant locator that incorrectly required a dialog inside each player card, and a final preservation check still expecting 17:00 after the scenario explicitly moved that session to 23:00. Those test defects were corrected; the complete unchanged scheduling journey then passed in 48.1 seconds. No force clicks, disabled security flags, discarded business assertions or enlarged timeouts were used. Product source stayed frozen during these browser runs. These results cover seven authenticated cases and two focused preview cases; they are not a claim that all 121 preview scenarios were rerun.

## Actual captures and inspected comparisons

The master case saved 40 viewport/full-page image pairs: all seven staff screens at 1536, 1440, 768, 390 and 320 px; Parent Home/Fees at 390/320; and Coach Home at 1536. Every document width fits its viewport. Narrow Players/Fees tables were actually panned; Fees tabs were panned and their final action selected. Financial metric values fit their cards on one visual line at every captured width. See [capture manifest](screenshots/academy-portal/capture.json).

All comparisons below were opened and inspected. Desktop references and browser inputs share native 1536 px width. Parent reference crop removes device/status/presentation chrome and is proportionally scaled to 390 px; its metadata discloses this. No reference was flattened behind UI hotspots.

| Screen | Actual viewport | Reference / actual / remaining differences |
| --- | --- | --- |
| Coach Home | [1536](screenshots/academy-portal/coach-home-1536.png), [Home1440](screenshots/academy-portal/home-1440.png) | [Comparison](screenshots/academy-portal/comparisons/home-1536.png) |
| Players | [1536](screenshots/academy-portal/players-1536.png), [390](screenshots/academy-portal/players-390.png) | [Comparison](screenshots/academy-portal/comparisons/players-1536.png) |
| Calendar | [1536](screenshots/academy-portal/calendar-1536.png), [390](screenshots/academy-portal/calendar-390.png) | [Comparison](screenshots/academy-portal/comparisons/calendar-1536.png) |
| Training | [1536](screenshots/academy-portal/training-1536.png), [390](screenshots/academy-portal/training-390.png) | [Comparison](screenshots/academy-portal/comparisons/training-1536.png) |
| Reports | [1536](screenshots/academy-portal/reports-1536.png), [full](screenshots/academy-portal/reports-1536-full.png) | [Comparison](screenshots/academy-portal/comparisons/reports-1536.png) |
| Fees | [1536](screenshots/academy-portal/fees-1536.png), [1440](screenshots/academy-portal/fees-1440.png), [320](screenshots/academy-portal/fees-320.png) | [Comparison](screenshots/academy-portal/comparisons/fees-1536.png) |
| Settings | [1536](screenshots/academy-portal/settings-1536.png), [390](screenshots/academy-portal/settings-390.png) | [Comparison](screenshots/academy-portal/comparisons/settings-1536.png), [independent saved branded academy](screenshots/portal-integration/settings/reference-versus-actual-1536.png) |
| Parent Home | [390](screenshots/academy-portal/parent-home-390.png), [320](screenshots/academy-portal/parent-home-320.png) | [Comparison](screenshots/academy-portal/comparisons/parent-home-390.png) |

Native images and matching `-full.png` variants are retained. Comparison JSON includes exact source and image hashes, dimensions/crop and observed differences. The generic comparison script composes existing evidence; it never generates browser screenshots.

Major corrections before returning: restored the full football treatment; compacted Players filters/header; enlarged small table/drill text; corrected Calendar timing geometry and late-session reveal; rebuilt detail icon/focus/preparation groups; corrected Settings/sidebar density; fixed actual table overflow and Fees tab/currency wrapping; made Parent shortcuts visible and coach wording honest.

Remaining visual differences are explicit in each comparison: actual row counts, dates, long names and missing evidence; absent player portraits; self-hosted Noto font metrics; some record-dependent spacing; low-resolution provided crest with navy tile; editable pitch diagrams instead of drill photographs because the current drill model has no media field. Parent's current-week plan remains awaiting coach approval in this capture; future-week data is not presented as current. No scores, photos, delivery or payment connection are invented to imitate sample content.

## Documents and external boundaries

The actual private [monthly PDF](screenshots/academy-portal/approved-monthly-report.pdf), [batch-only monthly PDF](screenshots/academy-portal/batch-only-approved-monthly-report.pdf) and [verified payment receipt](screenshots/academy-portal/verified-academy-receipt.pdf) use the approved/issued snapshots and academy identity. All monthly pages and the receipt were rendered and inspected; the ordinary-word wrapping defect was corrected and covered using the real embedded fonts. These are synthetic QA records, not real payments.

Online collection remains NOT_CONNECTED. Manual references require explicit authorised verification before reducing a balance or producing a receipt. WhatsApp has no configured academy sender credentials/verified WABA and templates in this environment; delivery remains NOT_SENT. Existing queue/provider/consent/signature/retry boundaries remain covered without real sends. Subscription billing, academy deletion and payment reversal/refund are unsupported, labelled and disabled rather than simulated.

Figma's authorised account/destination was rechecked and still returned the Starter MCP tool-call-limit error. No editable frames were written and no file/node links are invented. Local React components and text are editable.

## Preservation and review scope

The branch map is in [ACADEMY_PORTAL_INTEGRATION.md](ACADEMY_PORTAL_INTEGRATION.md). Existing stacked work, separate worktrees, historical data and the original uncommitted Next generated-type imports are preserved. The user's `qa-communication-phone.png` remains unchanged (SHA256 `0B90FB1B895A7BF0201A1493D602D285618EB649BF7C9B07BE445BCB865F0F66`). Raw auth traces, diagnostic contexts, SQLite files, secrets, dummy credentials, historical screenshot baselines and the unrelated tournament package are excluded from the integration commit.

See [changed files](ACADEMY_PORTAL_CHANGED_FILES.md), [finance](ACADEMY_FINANCE.md), [Settings](SETTINGS_PORTAL_INTEGRATION.md), and the existing deployment/security guidance for operational limits. No main merge, deployment, real charge or real external message was performed. Functional verification is separate from user visual approval.
