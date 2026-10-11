# Football-only QA report — 12 October 2026

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
