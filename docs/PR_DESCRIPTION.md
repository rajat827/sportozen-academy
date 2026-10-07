# Build Sportozen Academy Concept B responsive product foundation

Build the first frontend for Sportozen Academy, starting from an empty repository. Owners can manage a fictional academy and roster; coaches can move from player goals through personalised sessions, attendance, observations, evidence review and report approval; parents can view only their linked player's public, reviewed progress.

The Concept B interface uses navy navigation, green actions, evidence provenance badges, responsive tables/cards and a mobile parent experience. A typed domain and versioned browser-storage repository persist demo edits and provide a future API boundary. Football vocabulary lives in sport configuration. Payment entries are records only, communication stays Not Sent, and media is clearly labelled demo simulation.

Validation: `pnpm lint`, `pnpm typecheck`, `pnpm test` (7 passed), `pnpm build`, and Playwright (6 scenarios passed). Browser checks cover all 36 supported route examples, the nine requested smoke flows, parent filtering, persistent edits, local PDF download, and overflow at all six requested widths. Eight screenshots are saved in `docs/screenshots/`; detailed evidence is in `docs/VALIDATION.md`.

The repository began empty. `main` contains only an empty comparison baseline; all implementation commits are on `codex/concept-b-foundation`. No application changes have been merged into `main`.

Remaining scope: authentication and server authorisation, real media and uploads, payments, delivery, fuller academy/player editing, historical aggregation and formal review audit logs. Some setup sections are read-only, the video timeline is simulated, and PDF output is a simple local demo report. Exact partial modules and production requirements are detailed in `docs/ROADMAP.md`.
