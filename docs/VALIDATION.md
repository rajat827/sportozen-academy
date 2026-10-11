# Verification record

Verified locally on Windows, 7 October 2026, against the production Next.js server.

Story: an owner selects a player; a coach edits goals, creates and personalises a session, records attendance and evidence, then approves a report; the linked parent reads reviewed public progress. Edits flow from the feature hook through the repository into the browser-storage adapter and survive refresh. No backend is configured or required for this demo.

## Commands and results

| Command                                           | Result                                     |
| ------------------------------------------------- | ------------------------------------------ |
| `pnpm lint`                                       | Passed, zero errors and warnings           |
| `pnpm typecheck`                                  | Passed, strict TypeScript                  |
| `pnpm test`                                       | Passed, 7 tests in 2 files                 |
| `pnpm build`                                      | Passed, Next.js 16.4.0 production build    |
| `$env:PLAYWRIGHT_CHANNEL='chrome'; pnpm test:e2e` | Passed, 6 browser scenarios in 1.4 minutes |

Browser tests use installed Chrome locally. CI uses Playwright Chromium. Both are headless. The CI workflow installs dependencies, runs all quality gates and uploads screenshots/traces.

## Evidence

- Repository tests cover persistence through a replaceable adapter, malformed storage recovery, tenant/sport reference coherence, missing attendance and parent record projection.
- Route tests validate supported shapes and rejection of unsupported roles/modules. A pre-render route guard ensures unsupported URLs return HTTP 404 before streaming.
- Browser scenarios cover all nine requested smoke flows, plus academy edits, drill reordering, evidence/report approval, new-player development plans, fee references, approved Not Sent parent previews and local PDF download.
- All 36 supported route examples render HTTP 200 without browser exceptions; an unsupported module returns HTTP 404.
- Overflow checks cover dashboard, directory, builder, Session Desk and parent progress at 1440, 1280, 1024, 768, 390 and 320 pixels.
- Eight required screenshots are in `docs/screenshots/`: owner dashboard, coach dashboard, directory, profile, development plan, tablet Session Desk, parent home and parent progress.
- Screenshots were visually inspected against the supplied Concept B direction for navy/green hierarchy, spacing, density and responsive layout. Chart capture waits for the lazy-loaded plot and disables plot animation to make visual evidence repeatable.

## Issues found and corrected

- Nullable session reference in observation capture: explicit guard before capture.
- Search update loop: stable memoised filtered data supplied to TanStack Table.
- Demo role accessibility label: explicit label on the selector.
- Lazy chart screenshot timing: reserved loading space, immediate plot rendering and an explicit screenshot readiness assertion.
- Unsupported streamed route returning HTTP 200: route-shape proxy rejects it before rendering.
- Demo consistency: Aarav is right-sided, squad ages match groups, Rahul's player counts use squad assignment, and new players receive editable plan/path and fee-account records.

## Limits of verification

No external API, authentication, payment, media or messaging integration exists. Parent projection tests demonstrate UI filtering, not secure authorisation. Formal assistive-technology testing and production access-control review remain. The historical attendance percentage is seeded demo data; current attendance records are verified independently. See `ROADMAP.md` for exact remaining scope.

## Playback repair — 10 October 2026

The previous evidence player advanced a timer over a static image. Seeded evidence now plays a committed 32-second fictional MP4 animation with captions, native controls, actual playhead seeking and persisted bookmarks. New coach observations without media show “No video attached”. All seeded clips use the same illustrative animation; it is not recorded player footage.

Validation: lint, strict typecheck, production build and all 9 unit tests passed. The 6 existing browser scenarios passed; the added playback scenario passed after correcting its coach-note test selector. It verifies real video playhead movement, pause, keyboard seeking, bookmark and note persistence after reload, resumed playback, and mobile overflow. Desktop and mobile evidence screenshots are in `docs/screenshots/evidence-video-*.png`.

The app serves the committed clip without external services. Regenerating demo assets with `node scripts/create-demo-media.mjs` requires installed Chrome and FFmpeg.

## Communication preparation and approval — 10 October 2026

Implemented seven templates, related player/squad/session selection, source snapshots and explicit verification, editable previews, drafts, internal approval/rejection, activity history, and approved manual clipboard copying. Approval records APPROVED, then leaves the draft NOT_SENT. Editing clears approval. No provider calls exist. Settings lists four disconnected future integration placeholders with disabled actions. New drafts remain internal after approval and copying; parent messages accept fictional fixture records only. Legacy communication statuses/channels migrate without invented approval or delivery history.

Lint, strict typecheck, production build and all 12 unit tests passed. The 7 existing browser scenarios passed against this build; the new communication scenario passed after correcting its template-dropdown selector. It verifies rejection/resubmission/approval, clipboard contents, history after refresh, revision clearing approval, parent non-disclosure, seven templates, disconnected settings and mobile overflow. Desktop/mobile screenshots were visually inspected. See `COMMUNICATION.md` for current boundaries and future provider prerequisites.

## Report redesign validation — 11 October 2026

Lint, strict typecheck, 17 unit tests and the production build pass. Browser coverage includes actual report download and repeat-download state invariance, draft edits clearing parent access, parent privacy, generation failure/retry, long-name/observation pagination, optional empty data and six-width report screenshots (1440, 1280, 1024, 768, 390, 320). The PDF validation script checks A4 pages, selectable facts, no unsupported percentages or other-player/private notes, complete long observations, repeated headers/footers and page numbering. All PDF pages are rendered with Poppler and visually inspected. Final browser and PDF results are recorded in docs/screenshots/reports/pdf-validation.json and the review description.

Final export verification: sample and repeat download each one A4 page; long recorded-observation fixture three A4 pages; missing-record fixture one page. Searchable text, complete final observation/note, local fonts, correctly rendered translated glyphs, all page numbers and geometric safe bounds passed PDF validation. Every rendered page was visually inspected. The first complete browser run passed all 15 scenarios; subsequent Windows sleep interruptions were diagnosed and the final rerun is recorded in the PR.

Final rerun: all 15 browser scenarios passed in 1.7 minutes. Lint, typecheck, 17 unit tests and build passed; PDF fact, safe-bound and pagination checks passed for all four export fixtures.
