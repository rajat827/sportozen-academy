# Bharat Football Academy synthetic simulation

## Successful isolated seed checkpoint

The actual-service builder completed successfully for academy `29dcb420-0c2e-42db-8f61-f4b16a921bae` in ignored database `.local/e2e-bharat-final-20261015c.sqlite`. This is fictional QA data, separate from the normal local customer database. No existing database was reset.

| Persisted record                                                            | Verified total |
| --------------------------------------------------------------------------- | -------------: |
| Football batches: Under-8, Under-10, Under-12, Under-14, Under-16, Under-18 |              6 |
| Unique fictional players                                                    |             60 |
| Players per batch                                                           |             10 |
| Unique active linked fictional guardians                                    |             60 |
| Completed August/September sessions                                         |             54 |
| Upcoming October sessions                                                   |              6 |
| Total sessions                                                              |             60 |
| Historical attendance records                                               |            540 |
| Upcoming attendance records, all unmarked                                   |             60 |
| Total attendance records                                                    |            600 |
| Recorded evidence, including limited/unclear observations                   |            504 |
| Approved August reports                                                     |             60 |
| Approved September reports                                                  |             60 |
| Total unique monthly reports                                                |            120 |

The machine-readable source manifest is [manifest.json](screenshots/final-academy/bharat/manifest.json). Each player links to their batch, coach, guardian, both report IDs, source session/evidence IDs, recorded attendance counts, valid comparison pair and immutable report snapshot hash. The manifest contains no passwords, cookies or authentication tokens.

## Repeat safely

Run from the repository root with the installed Node24/pnpm dependencies. Choose a **new** dedicated filename for every attempt. The builder rejects any path outside `.local`, a filename outside the `e2e-bharat-*.sqlite` pattern, or any existing database/WAL/SHM at that path. It does not delete or truncate partial attempts.

```powershell
$env:SPORTOZEN_DATABASE_PATH = '.local/e2e-bharat-' + [guid]::NewGuid().ToString('N') + '.sqlite'
$env:BETTER_AUTH_URL = 'http://127.0.0.1:3001'
$env:SPORTOZEN_WHATSAPP_SEND_ENABLED = 'false'
$env:SPORTOZEN_WHATSAPP_LIVE_ENABLED = 'false'
node --conditions=react-server --import tsx scripts/qa-bharat-simulation.ts
```

The command creates service records; it does not start a customer server. Do not run it against `.local/workspaces.sqlite`, reuse a successful seed path, or enable provider flags. It refuses explicitly enabled WhatsApp sending/live flags. It requires the access file to be gitignored before writing. Successful completion writes synthetic login details only to ignored `.local/bharat-qa-access.json` with creation mode0600. Keep that file and all credentials out of committed evidence, logs and screenshots. The public manifest and scenario values are repeatable; account/report/session UUIDs and synthetic passwords can differ between isolated runs.

## Real validation and historical clock

The script uses Better Auth account creation/sign-in, academy creation, invitation acceptance, player/placement/drill/plan services, training commands, period preparation/editing and normal report approval. It never inserts fabricated session/report rows or rewrites timestamps using SQL. Repository access in the builder reads and asserts the records saved by those application services.

Node’s `node:test` Date mock runs **only in this separate builder process**. Setup occurs31July2026; each dated August/September session proceeds through draft, scheduled, in progress, attendance, evidence review and completion at that synthetic session’s time. Evidence is asserted to fall inside its saved session interval. Coaches sign in through the real authentication service for their dated work. Reports are prepared/reviewed1October, after both reporting months end. The clock resets on success and on error; the normal browser/server clock is untouched.

The timetable uses five August Saturdays (1,8,15,22,29) and four September Saturdays (5,12,19,26), with six distinct one-hour batch slots at the supplied **Excelsior American School** location. No address, coordinates or Google Place ID are invented. Six20October upcoming sessions keep authenticated Home/Calendar useful; their unmarked attendance and planned activities are excluded from the completed August/September sources.

Each batch uses age-adapted recorded activities and a shared session objective. Only one child per batch has an optional individual adjustment; the other54 follow their batch plan. Deterministic fictional outcomes include comparable improvement in the same defined six-attempt activity, consistent observations, mixed results, missed/excused sessions, limited reviewed evidence and continued focus. Comparison uses the same child, drill/version, recording conditions, method and unit. No ranking, universal talent score, incompatible-drill comparison or unsupported improvement percentage is generated. The limited-evidence reports say so explicitly. One September report contains deliberately long commentary for PDF pagination verification.

The builder asserts60 distinct players and guardian IDs,60 active parent memberships, ten players per batch, correct batch/coach assignments,120 distinct report IDs, exactly the two required months per player, historical attendance completeness, completed source sessions with the correct child in their roster, and inclusive-start/exclusive-end local report boundaries. Evidence IDs must belong to the child, be reviewed/parent eligible, and fall inside the reporting period. Each August report has five source sessions; each September report has four.

## Validation failures retained honestly

Two initial fixture attempts failed normal application validation. They were **not** worked around by weakening schemas or writing SQL:

1. A drill used unsupported focus vocabulary `Decision-making`; the fixture was corrected to the configured `Positioning` focus while retaining the intended small-game purpose.
2. An optional plan used a free phrase where the configured focus enum was required; it was corrected to `Dribbling`, with the specific close-control wording retained in its appropriate explanation/observation fields.

The partial isolated databases `.local/e2e-bharat-final-20261015a.sqlite` and `.local/e2e-bharat-final-20261015b.sqlite` remain retained. The corrected run used fresh path `...15c.sqlite` and passed. These were fixture-validation findings, not confirmed product save defects.

## Actual authenticated verification

The final rebuilt browser run **62367 passed1/1 in3.2minutes** on build20818. It checked all120 private PDF exports against persisted player, month, source session/evidence IDs and immutable snapshot hashes. Each PDF contains the correct academy/child/period, excludes all59 other child names and private staff markers, and has A4 pages. Owner can export all120; a linked parent sees only their own two reports; another-family parent and another-batch coach receive the exact generic404; anonymous access receives401.

The actual September filter now shows60 matching approved reports. The browser traverses all eight native pages (eight rows on seven pages, four on the last), checks all60 distinct children and View actions, opens the last child's exact September report and opens the full preview of the long report through its final Review note30. Compact preview excerpts never replace the underlying snapshot or PDF.

All35 main-screen captures (seven screens × five widths) and four Parent Home/Reports captures passed overflow/context/privacy checks. The selected Calendar session's mobile detail modal is exercised as intended; it is not mistaken for an obstructed navigation control. Parent Home retains its approved first-name greeting, with the exact linked child ID in the route and private payload. Narrow Players titles reserve space for their close control; their actual bounding boxes must be disjoint.

Evidence: [browser verification](screenshots/final-academy/bharat/verification.json), [PDF checks](screenshots/final-academy/bharat/pdf-verification.json), [39 screenshot hashes/dimensions](screenshots/final-academy/bharat/screenshot-manifest.json), [screens and representative PDFs](screenshots/final-academy/bharat/README.md), and [approved/actual/differences boards](screenshots/final-academy/comparisons/README.md).

The delivered screenshot manifest identifies the source of each current file: 21 desktop/tablet images were refreshed with neutral scroll/focus in capture-only run 9150; 18 mobile/Parent images retain their successful run 62367 provenance. The redundant helper stopped on a hidden lazy sidebar-logo readiness check, with no product assertion failure. Its predicate was corrected and lint/type checks passed; no further browser run is claimed. Original source/PDF/role verification remains separate and unchanged.

Independent PDF analysis verifies all120 downloads against the export hashes, every approved body field including the long note, character bounds, privacy and heading/first-card flow. Representative PDF render/inspection results and the final full browser-regression gate are recorded in the final QA report. No visual approval is inferred.

To repeat export/capture verification, provide Python with pdfplumber via `SPORTOZEN_QA_PYTHON` (or an available `python` command), the existing seeded ignored access file, the isolated QA build flags and `pnpm qa:bharat:verify`. Then run `python scripts/verify-bharat-pdfs.py`. The script never installs a provider, sends messages or resets the database. All120 temporary downloads and expected snapshot text remain ignored under `.local/bharat-pdf-verification`; four representative actual PDFs are saved as review artifacts.

No real children, live messages, collected payments, deployment or main merge are involved.
