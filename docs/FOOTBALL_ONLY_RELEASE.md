# Football-only release — 12 October 2026

Football-only release. Multiple independent academies. Personalised player development. No rankings.

Supersedes the previous multi-sport launch scope. The feature branch continues from `codex/multi-academy-multi-sport-foundation` at `6d202bf`; authenticated workspaces, redesigned reports and parent communication are preserved.

## Active product

No sport selection, participation checklist, Add Sport action or other-sport configuration appears in onboarding/workspaces. New academies and sporting records default to football on the server. Explicit unsupported sports are rejected by creation/configuration/record APIs, including programmes. Only existing close-control curriculum is offered; focus choices include receiving, passing/weak-foot passing, dribbling/ball protection, finishing, scanning, positioning/off-ball movement, defending/recovery and goalkeeping. Extra focus vocabulary is not an invented complete drill library.

Plans explain focus, reason, assigned drills/purposes, observation criteria, review date and next step. The approved report snapshot drives both screen and PDF. Staff/guardian privacy, academy isolation, full-navigation academy switching and NOT_SENT external delivery are retained. General nutrition remains optional approved content, not a clinical diet generator.

## Historical records

No database cleanup, destructive migration, customer reset, relabelling or running-app restart is performed. Existing other-sport records remain byte-for-byte in storage. Customer projections filter their players, plans, drills, programmes, reports, updates and linked conversations; stale direct URLs return unavailable. Approved parent plan snapshots are filtered too. Historical configuration is retained when settings are saved. Existing mixed players retain stored non-football enrolments; the customer projection shows football participation only.

Operator recovery/export of historical backups requires verified ownership and an audited authorised procedure outside the customer interface. It is not a supported active sports workflow. Existing historical screenshots/docs retain their dated provenance and must not be presented as this release's launch scope.

## Validation boundary

Three independent fictional football academies cover India, UK and Australia. Browser tests use port 3001 and a filename-guarded `.local/e2e-*.sqlite`; a second owned test process on port 3002 verifies persistence across restart using the same test database. QA builds use `.next-football-qa` so an existing app's served assets are preserved. CI uploads only screenshots/PDF artifacts, not credential-bearing raw traces.

Authenticated session personalisation, attendance, structured evidence/media and secure production operations remain blockers. Passing their separate fictional demo tests cannot mark the full customer journey passed. See QA_REPORT.md and PILOT_READINESS.md.
