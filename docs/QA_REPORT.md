# Authenticated football training QA — 12 October 2026

Current feature: `codex/football-session-evidence-workflow`, based on football-only `e99ebd98f03a5af23c245923c849daef3a47ca35`. Final source: `eeba12a69aa089bbd8d144b882e3ceffbbdf2c85` (core workflow `917bdc6`). Documentation/artifact commits do not change the implementation.

## Training acceptance

| Coverage | Result / precise boundary |
| --- | --- |
| Authenticated owner → coach → parent journey | PASS. Separate real Better Auth sessions and synthetic DB, no demo role switch or copied record storage. |
| Squads / venues / sessions | Explicit roster and branch/venue relationships, assigned coaches, local zone/UTC times, ordered drill versions/durations, DRAFT/SCHEDULED/IN_PROGRESS/COMPLETED and separate cancellation. |
| Personal objectives | Different objectives for two children; historical roster/objectives survive squad and plan edits. Missing goal is explicit, never an inferred weakness. |
| Attendance | UNMARKED by default; individual/bulk saves, reasoned corrections, unique session/player IDs, version history, cancelled writes rejected. No seeded percentage or zero default. |
| Coach evidence | Observation plus defined results, author/time, conditions, method/unit/drill version, separate private note, review state. Invalid counts rejected; zero attempts generate no percentage. No video/AI claim. |
| Reviewed plan/report/update | Reviewed evidence updates next step; completed-session evidence creates the report; explicit report/update approval, correct private in-app parent publication and replies. NOT_SENT external. Upcoming messages explicitly describe planned work. |
| Reliability | Identical retries preserve one result; stale writes/approvals return 409; mixed bulk conflict rolls back; a real SQLite failure trigger returns 500 without a saved record/receipt, and the same request succeeds after the trigger is removed. UI 503 retains the schedule draft before a real retry. |
| Scope/privacy | Independent second academy contains its own session/attendance/evidence/report. Direct cross-academy GET/write/export denied, invalid relationships rejected, parent raw-training read/write/history denied, only linked child's approved snapshots/messages returned, internal notes excluded, revoked coach cookie and replay denied. |
| Time zones | India and UK session UTC conversion verified against saved local times. London spring gap/autumn ambiguity rejected through the actual API. Unit checks also cover Perth and impossible dates. |
| Persistence | Browser refresh, a fresh parent sign-in and controlled restart of only the owned port-3002 test process preserve records. Customer port 3000 stays alive. |
| Mobile | Session list, objectives, attendance, agenda, capture, review, report, update and parent reply at 1440/768/390/320; no horizontal overflow. Nested sticky-menu overlap found during visual inspection and corrected before final rerun. |
| Actual PDF | Private parent's actual server export saved in football-training artifacts; every page rendered, facts/privacy/bounds checked. Known long-fixture P2 PDF-001 carried forward, not silently resolved. |

## Final gates for this feature

Final source `eeba12a69aa089bbd8d144b882e3ceffbbdf2c85` passes all configured gates, including the phone visual fixes and final transaction checks:

| Exact command | Final result |
| --- | --- |
| `pnpm lint` | PASS, zero errors/warnings |
| `pnpm typecheck` | PASS, strict TypeScript |
| `pnpm test` | PASS, 30 tests / 8 files |
| `$env:SPORTOZEN_QA_BUILD='1'; pnpm build` | PASS; pre-existing SQLite dynamic-filesystem tracing warning retained |
| `$env:SPORTOZEN_QA_BUILD='1'; pnpm test:e2e` | PASS, all 17 scenarios in 3.0 minutes; zero skips |
| Bundled Python `docs/screenshots/football-training/validate_pdf.py` | PASS, actual one-page parent export, source facts/privacy/A4/bounds/glyphs/numbering |
| Poppler render and visual inspection | PASS for every page of the actual session export (1 page). PDF-001 remains open for the separate long legacy fixture. |

36 screenshots cover nine authenticated surfaces at four widths. Representative phone, tablet and desktop surfaces were visually inspected; automated overflow checks cover every captured width. The updated parent thread capture shows the actual viewport and bottom navigation. One actual PDF, its rendered page and validation script/JSON are included. This is browser emulation, not physical-device certification.

An earlier final run was interrupted by an approximately eight-hour computer sleep: Chromium reported ERR_NETWORK_IO_SUSPENDED and a later legacy operation timed out, leaving 15 passes / 2 failures. No assertions were weakened. An awake rerun passed all 17; after the final timestamp/capture polish, a rebuilt full rerun passed all 17 again in 3.0 minutes. The PDF checker initially matched SENT as a substring of PRESENT; it now checks whole delivery-state words while preserving the explicit Not sent and privacy assertions.

QA uses only guarded `.local/e2e-*.sqlite`, port 3001, separate `.next-football-qa` assets and individually owned port-3002 restart processes. Customer DB was never reset or seeded; no customer app restart or deployment occurred. A deliberate SQLite error logged by the test server is expected failure-injection evidence, not an unreported failing test. Raw authentication traces remain local/ignored; only fictional screenshots/PDFs are committed.

New evidence is `docs/screenshots/football-training/`; reproduction and migration/rollback instructions are in FOOTBALL_SESSION_WORKFLOW.md. Scope is supervised synthetic-data training using coach-recorded evidence. Real child data, video analysis, real payments and external delivery remain outside readiness. Broader untested legacy concurrency/idempotency, recurring schedules, quiet-hour dispatch and secure video upload are not claimed complete.

**READY WITH KNOWN P2 LIMITATION — supervised synthetic-data pilot using coach-recorded evidence only.** See PILOT_READINESS.md. This does not mark real child-data production ready.

## Historical football-only release QA

The remainder records the preceding release's findings. Its NOT_IMPLEMENTED session/attendance/structured-evidence entries and NOT READY verdict describe the former baseline and are superseded by the training acceptance above. Secure media remains separate work.

# Historical football-only QA report — 12 October 2026

Football-only release. Multiple independent academies. Personalised player development. No rankings.

## Environment and isolation

Branch: `codex/football-only-release`. Base: `codex/multi-academy-multi-sport-foundation`, `6d202bf9a096f26898f23e51041a7f90917d9601`. Windows, Node 24.18.0, pnpm 11.25.0, Next 16.4.0, Chromium via Playwright 1.63.0. Only synthetic accounts/records are used. Accounts authenticate against Better Auth APIs; browser contexts carry those real server sessions, not a demo role switch or copied browser record storage.

Customer app port 3000 remains running. Browser checks own port 3001 and a newly generated `.local/e2e-UUID.sqlite`. Filename/path guards reject `.local/workspaces.sqlite`; an explicit negative preflight confirmed rejection before any server starts. A separately owned process on port 3002 reads the same test DB, stops, starts again and checks identical records with the existing authenticated session. The QA build uses `.next-football-qa` and does not overwrite the running app's assets. No customer database reset, non-football record migration, external delivery, payment collection or deployment occurred.

## Coverage

PASS means only the stated tested behaviour, not complete commercial feature readiness. NOT_IMPLEMENTED is a missing authenticated feature. BLOCKED means the full journey depends on it. NOT_TESTED denotes uncovered behaviour.

| Feature | Authenticated result | Evidence / boundary |
| --- | --- | --- |
| Accounts and academy onboarding | PASS | Separate owner A/B/C, coach and parent accounts; owner UI creates empty independent football academies. |
| Regional settings | PASS | India/INR/Asia-Kolkata/en-IN, UK/GBP/Europe-London/en-GB, Australia/AUD/Australia-Perth/en-AU saved and checked. No combined currency calculation. |
| Unsupported sports | PASS | No sport selector; automatic football; API rejects cricket, badminton and unknown sports for creation/activation and sporting record kinds. |
| Historical records | PASS | Test-only retired player/plan/drill/report/update/programme/conversation remain byte-identical. Lists/direct links/PDFs restricted; saving settings preserves storage. Coach guardian metadata also excludes historical-only assignments. |
| Other-sport-only legacy onboarding edge | NOT_TESTED | Code-reviewed configuration-required copy and enable-football path; automated historical fixture is mixed. |
| Coach invitation/assignment | PASS | Intended coach accepts manual token, owner UI assigns player, separate coach context creates plan. Parent invitation wrong-account/reuse checks denied; no invitation email simulated. |
| Players and guardian links | PASS | Own linked child only; unrelated child denied; explicit parent membership in a second academy; no implicit merge. |
| Individual plans and drills | PASS | Coach UI chooses focus/drill, reason, observation criteria, safe optional practice, date/status/next step; save/reload checked. Only actual existing template is used. |
| Football team session personalisation | NOT_IMPLEMENTED | No customer session record/API/UI; fictional demo separately tested. |
| Football attendance | NOT_IMPLEMENTED | No customer attendance ledger; legacy demo does not satisfy the customer journey. |
| Structured training evidence/media | NOT_IMPLEMENTED | No customer collection/upload/media authorisation workflow. Coach-entered report observation exists but is not a session-evidence pipeline. |
| Approved reports and PDF | PASS | Actual assigned-plan sources, coach provenance, approval, parent snapshot/PDF, edit clears approval/parent export. Screen and PDF share immutable snapshot. |
| Development updates | PASS | Approved source, review/approval, linked-parent publication; external delivery stays NOT_SENT. |
| Parent/coach conversations | PASS | Parent mobile reply and assigned coach UI response; refresh sees response; staff-only notes excluded from parent API/UI and retained for staff. |
| Parent report coverage by academy | PASS / NOT_TESTED | A UI/PDF, C approved plan/report API and academy switch; B's separate parent inbox not tested. |
| Nutrition/preferences | PASS | Canonical academy-approved general guidance, disclaimer, opt-out/opt-in, private fictional dietary note, clinical-text rejection. |
| Academy switching and permissions | PASS | Private client state clears on full navigation; direct cross-academy reads/writes/PDFs denied; unassigned coach/other child denied; revoked membership denies existing cookie; platform metadata and approved support scope separate. |
| Persistence/restart | PASS | Plans, reports, messages, replies/preferences and other recorded workspace state survive refresh and a controlled same-DB test-server restart. |
| Failed player save | PASS | One injected 503 retains draft name; retry saves through actual backend. Not a claim of all interrupted-transaction/idempotency coverage. |
| Responsive layout | PASS | Authenticated onboarding, coach plan and parent plan/report at 1440/1280/1024/768/390/320; no horizontal overflow; parent inbox/reply mobile captures. Browser emulation, not physical-device certification. |
| Existing fictional demo regressions | PASS (automated checks) | Separate tests cover sessions/objectives/attendance, evidence playback/bookmarks, internal messaging, report PDFs, fee references and route/mobile inventory. These are never substituted for customer feature gaps. The long-PDF visual issue below remains open. |
| Branch/programme authoring | NOT_TESTED | Existing customer APIs/UI retained; complete branch/programme creation flow not newly exercised. Squad is currently a player label; venue/squad scheduling entities are not implemented. |
| Fees | NOT_TESTED | Customer scoped API retained; no customer fee-operations UI pilot journey. Existing fictional fee references receive regression coverage. |
| DST scheduling, unit conversion, quiet-hour dispatch | NOT_IMPLEMENTED | Regional preferences are stored, not execution of those behaviours. |
| Concurrent edits, retry idempotency, expired invitation/support edge cases | NOT_TESTED | Require further reliability/security work; no stronger claim is made. |
| Full owner → coach → session → evidence → report → parent journey | BLOCKED | Authenticated sessions, attendance and evidence are missing. |

## Final quality gates

Tested implementation commit: `629f0e72bdb5fec7dce7620946a0b978a936dc40`. The following documentation/screenshots commit adds validation evidence only; implementation is unchanged. The build tested the same implementation tree before that source commit; the final complete browser run executed at that commit.

| Exact command | Final result |
| --- | --- |
| `pnpm lint` | PASS, zero errors/warnings |
| `pnpm typecheck` | PASS, strict TypeScript after normal route type generation |
| `pnpm test` | PASS, 22 tests / 6 files |
| `$env:SPORTOZEN_QA_BUILD='1'; pnpm build` | PASS; existing dynamic-filesystem tracing warning in SQLite adapter remains |
| `$env:SPORTOZEN_QA_BUILD='1'; pnpm test:e2e` | PASS, all 16 scenarios in 5.6 minutes; none skipped |
| `pnpm exec next typegen` | PASS; normal generated type references restored without changing served assets |
| `python docs/screenshots/football-only/validate_pdf.py` (bundled Python) | PASS, one-page authenticated report facts/privacy/A4/bounds/numbering |
| `python docs/screenshots/reports/validate_pdfs.py` (bundled Python) | PASS, sample 1 page, repeat 1, long 3, missing-record 1; text checks do not override the long fixture's visual finding |

Initial helper type/selector failures are described in QA_BUG_LOG.md and did not remove privacy/preservation assertions. The final rerun has no automated failures or skipped tests. Required customer sessions/attendance/evidence remain NOT_IMPLEMENTED and block the full training workflow; they were not skipped tests disguised as success. The pre-existing P2 long-PDF visual finding is still open. No external messaging ran.

## Sanitised visual evidence

`docs/screenshots/football-only/` contains football onboarding for the three regions, six-width onboarding/coach-plan/parent captures, regional plan screens, approved report, parent inbox/thread/preferences, platform metadata and disconnected WhatsApp settings. Captures contain fictional records only; invitation tokens/passwords/cookies are absent. Raw failed traces stay local/ignored and CI does not upload them.

The authenticated parent PDF's sole page was rendered and visually inspected. Selectable approved facts, correct academy/player/football/coach, A4 bounds, page number and exclusion of private notes/other children/other sports pass `validate_pdf.py`. Existing sample/repeat/long/missing demo PDFs pass text/fact/privacy/bounds checks. Visual review of all three long-report pages found missing repeated header/footer text on continuation pages despite its presence in extracted text; page numbers and body remain visible. This unchanged renderer limitation is recorded as P2 PDF-001, not presented as passing repeated-branding visual QA.

**NOT READY — BLOCKERS LISTED**
