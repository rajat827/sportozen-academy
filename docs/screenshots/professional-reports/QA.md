# Professional Reports verification — 16 October 2026

Story: an authorised staff member selects a real Academy child/month, reviews the existing approved snapshot, and downloads the same parent-readable facts as an academy-branded A4 PDF. A linked parent can read/export only that child's approved reports. Export does not publish or externally deliver anything.

Branch: `codex/professional-report-ui-final`. Starting commit: `6184cec4474091da2e994f91a677e94e30672f68`. All databases, credentials, traces and the 120-export working set remain ignored. Public evidence contains fictional QA records only.

| Check | Actual result |
| --- | --- |
| `pnpm lint` | PASS. The new isolated build directory is excluded, consistently with the older QA build directories. |
| `pnpm typecheck` | PASS. |
| `pnpm test` | PASS: 258 tests in 28 files. |
| `pnpm build` with Reports QA output | PASS. Existing dynamic SQLite-path tracing warning remains; no deployment is performed. |
| Existing full `pnpm test:e2e --reporter=line` | 57 passed, 2 failed in 21.5 minutes; both causes and reruns are recorded below. |
| Targeted rerun of the two affected authenticated cases | PASS: 2/2 in 4.3 minutes on the corrected build, fresh isolated data and separate trace output. All 59 distinct existing cases have now passed across these runs. |
| `playwright.professional.config.ts` | PASS: 1/1, repeated on the final corrected build in 3.3 minutes. Actual 120 exports, 60 children and phone/desktop controls verified. |
| Independent PDF inspection script | See [pdf-verification.json](pdf-verification.json): all 120 exports / 122 pages; exact selectable facts, images, bounds and repeated branding checked. |
| Original Academy read-only verification | PASS: 60 players, 180 reports, all 120 original approved snapshot hashes and 60 newer drafts preserved. See [source-preservation.json](source-preservation.json). |
| Pre-existing local tracked work | All 33 initially modified files match their saved SHA-256 values, including exact original generated type-file contents. Six previously clean test artifacts overwritten by older test helpers were saved separately and restored to their initial bytes. |
| User visual approval | Pending. Neither tests nor agent inspection establishes approval. |

## Failures found and resolved

The first complete browser case finished its application assertions but failed while closing traces: a simultaneous dedicated Reports run had cleared the same default Playwright artifact directory. The dedicated config now uses `.local/professional-reports-playwright`. The case passed its isolated rerun; no assertion was removed.

The regional workspace case exposed a real compatibility defect: parent formatting interpreted an unrelated preserved historical cricket snapshot before the football-only filter excluded it. Those old records intentionally lack the current football report fields. Parent records are now filtered before snapshot interpretation. A new unit regression verifies historical report/update schemas never reach formatting, remain byte-unchanged in storage and never enter the linked child's response. The full affected regional browser case passed after the fix.

The first independent text check falsely reported missing paragraphs because coordinate-sorted extraction interleaved four activity columns and the two bottom cards. The verifier now also checks the actual selectable character stream in original content order across pages, excluding repeated fixed header/footer margins. It continues to verify every complete recorded paragraph, measurement, date, activity purpose and closing note; no content assertion was removed. Actual page images were separately opened and inspected.

Earlier scoped checks also found and fixed cropped poster frames, inherited line-height overlap, main-report attendance formula text, stored label overrides, unresolved tab-panel IDs, authored commentary truncation and a missing non-monthly coach interpretation. Each fix is limited to report presentation/approval projection; raw authorised evidence and saved approvals remain intact.

## Browser → API → saved data → PDF

- Current staff selection comes from real workspace records, including all 60 roster children across six pages. Child search/selection, August/September switching, October Draft/no-export state, History selection, stale cross-child report IDs, keyboard tabs and panel relationships were exercised.
- Actual captures are [1536 px](after/reports-1536.png), [1440 px](after/reports-1440.png), [390 px](after/reports-390.png) and [320 px](after/reports-320.png). Every capture waited for fonts and all four activity images. Horizontal overflow, page errors and external requests were zero.
- Linked-parent captures are [390 px](after/parent-report-390.png) and [320 px](after/parent-report-320.png). Parents receive two approved reports for the linked child; drafts, staff Evidence, source IDs, raw formulas and other children are excluded.
- The parent could download its own approved PDF. Another child's report returned 404, and an anonymous request returned 401. Current server membership and child scope are rechecked for each export.
- Staff [Evidence](after/staff-evidence-1536.png) retains the complete original recorded source metadata. The parent-facing report and PDFs contain no raw internal evidence UUIDs, attendance formula or technical conditions.
- All 120 actual approved server exports were saved and hash-verified against their original approved snapshots. The complete report record list before/after export was identical: approval, revision, snapshot and delivery states did not change.
- Aadi August has 5/5 attendance, four actual activity types and the five recorded values 2/6, 2/6, 3/6, 3/6 and 4/6. Historical timestamps are explicitly labelled reviewed-observation dates. The saved coach, evaluation, next step and 30 September review date are retained.
- Representative actual August, long September, limited-evidence and another-academy PDFs were rendered and visually inspected. The report for Synthetic Portal Academy shows its own branding and coach rather than Bharat identity. Existing end-to-end checks additionally cover absent measurements, long/translated names and labels, reapproval, retry, persistence, role permissions and other Academy screens.

## Practical limits

The report is selectable but not a fully tagged accessible PDF. Noto Sans substitutes for the reference's unidentified font. No saved Bharat logo or player photo exists for the fictional source, so text/initials are used. Original static activity art differs in poses from the reference; it is generic demonstration, not footage. No mobile reference is supplied. Existing production SQLite/deployment and localisation limitations remain outside this presentation task.

Some old unit helpers call the renderer without the server's local poster injection and log `fetch failed`; their assertions pass. The actual authenticated endpoint embeds the fixed local PNG bytes, and all 120 exports independently contain their activity posters. No real provider, payment or WhatsApp operation was activated. No main merge or deployment was performed.
