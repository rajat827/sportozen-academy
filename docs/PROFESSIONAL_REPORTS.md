# Illustrated development reports

The authenticated Reports screen, parent preview and A4 export implement the supplied professional illustrated Reports reference within the existing Academy portal. This work is on `codex/professional-report-ui-final`, based on `6184cec4474091da2e994f91a677e94e30672f68`, a verified newer descendant of `codex/academy-portal-integration`. No other customer screen is redesigned.

[Actual screenshots, exports, comparison boards, checks and limitations](screenshots/professional-reports/README.md) are the review record. The implementation awaits user visual approval; there is no merge, deployment or external delivery.

## Existing workflow

Open `/workspace/[academyId]?section=reports`. Staff see ten actual players per page, a reporting-month selector, batch/status filters and player search. The selected child and month determine the report; an incompatible or stale report ID shows an unavailable state rather than another child's report. Report, Evidence, Activity and History tabs retain the selected context and support keyboard navigation. Create Report and Edit / Review open the existing preparation/approval workflow. Download exports only an approved saved report. Send to Parent opens the existing authorised message workflow; it does not send a message automatically.

Parents retain their existing Progress & Reports route and linked-child selector. They see only approved snapshots for their currently linked children. They cannot access staff Evidence, drafts or another child's PDF by changing a URL. Support access retains its existing scope and audit rules.

## One source for screen and PDF

`ReportViewModel` remains the approved snapshot. `reportPresentation()` derives the same parent-readable facts for the React preview and React-PDF renderer. It never fills an old approval from live players, plans, sessions or branding.

Newly prepared/approved reports can freeze optional typed `presentationData` alongside their existing source fingerprint and approval snapshot: attendance counts, reviewed measurements, observations and recorded coach interpretation. Dates come from actual source sessions. Editing, stale-source checks and reapproval retain the existing version/fingerprint rules. Approved corrections preserve original records and approval history.

Older snapshots use a conservative projection of their frozen wording. Attendance is recovered only from the known complete formatter grammar. Comparable numerical results require the same recorded meaning, drill version, conditions, units and attempt denominator. A missing or incompatible basis produces separate observations, not a trend or overall ability score. Historical review timestamps are explicitly labelled reviewed-observation dates; they are not relabelled as session dates. Missing data stays missing.

`parentReportSnapshot()` removes raw evidence references, drill IDs and technical collection metadata from the public response while retaining the actual readable facts. Staff Evidence keeps the original complete source wording and references. Parent reads exclude unrelated preserved historical sports before interpreting their old snapshot schemas. Projection never rewrites those stored records.

## Identity and illustration assets

Customer academy names, logos, accents, player identity and coach names come from the saved snapshot. A missing logo uses text; a missing player photo uses initials. The pictured example crest, portrait, coach and praise are not invented for current records.

The five original SVG illustrations and matching high-resolution PNG posters under `public/report-activities/` demonstrate movement warm-up, close control, passing pairs, small-sided play and a generic fallback. Only recorded activities are shown. [Provenance and rights](screenshots/professional-reports/illustrations.md) document their original authorship and hashes. They are static generic demonstrations, not player footage or assessment evidence.

## PDF

The existing authorised `/api/workspaces/[academyId]/reports/[reportId]/pdf` route checks the current session, membership, module and child scope, then requires an approved snapshot. It embeds fixed local activity posters and existing Noto fonts; no request-controlled filesystem path or external rendering service is used. Responses remain private/no-store and vary by cookie.

The A4 report includes actual identity, focus, attendance, activities, reviewed observations, coach interpretation, next step/review date and closing note. Text remains selectable. Short reports aim for one page; long recorded narratives flow onto additional pages with repeated academy branding, privacy footer and page count. Generic illustrations use full uncropped static posters.

The supplied Aadi August baseline is three pages. Its actual replacement is one A4 page with five attended sessions, four recorded activity types and the five results 2/6, 2/6, 3/6, 3/6, 4/6. Its coach is the saved Synthetic U8 Coach. The long September note remains complete across three pages. These are explicitly fictional QA records, not customer achievement claims.

Export only writes its existing audit entry. It does not alter approval, revision, in-app publication or external delivery. AI Video Analysis remains Coming soon.

## Verification and local preservation

The normal lint, TypeScript, unit, production build and browser suites remain required. `playwright.professional.config.ts` adds a dedicated 3004 server, an isolated fictional SQLite copy, and a separate ignored trace output directory. The guarded access file and credentials stay in `.local/`.

The professional browser check verifies all 60 roster children, all 120 original approved snapshots and PDF exports, period/child selection, history, keyboard tabs, drafts, parent/anonymous/other-child access, unchanged snapshots/delivery and actual captures at 1536, 1440, 390 and 320 pixels. `scripts/verify-professional-report-pdfs.py` independently checks every exported PDF's selectable facts, artwork, repeated branding, page bounds and absence of raw metadata. `scripts/create-professional-report-comparisons.py` builds honestly scaled, inspected reference/actual comparison boards.

The current original Academy database contains 180 reports, including 60 newer October drafts. QA uses a consistent separate database copy and preserves all 180 original records. Pre-existing uncommitted screenshots and generated type-file contents are separately hash-checked and retained. Other original untracked files are excluded from this change.

The local review build uses `.next-professional-reports-qa` so older `.next-final-qa` servers remain available. Set `SPORTOZEN_QA_BUILD=1` and `SPORTOZEN_REPORTS_QA=1` consistently for build/start. The current local review URL is recorded in the evidence index. No provider credentials or databases belong in the pull request.

## Limits

The reference's exact font is unidentified; the existing bundled Noto Sans is used. The original illustration poses differ from the reference while retaining its pitch/player/equipment treatment. The supplied report panel is presentation artwork; the actual export retains true A4 proportions. No mobile reference is supplied, so phone captures establish readability and usability rather than an unsupported exact match. PDF text is selectable but the document is not a fully tagged accessible PDF. Existing localisation and production SQLite/deployment limitations remain outside this Reports presentation task.
