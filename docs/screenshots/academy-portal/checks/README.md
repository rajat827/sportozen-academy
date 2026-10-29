# Integrated portal browser evidence

Run date: 15 October 2026. All accounts and academy records in these files are synthetic and isolated in Playwright's unique e2e SQLite database. No customer database was reset and no external payment or message provider was called.

Raw trace ZIPs and error-context files can contain synthetic authentication details. They are retained only under the ignored `.local/portal-browser-diagnostics/` folder; original test-run files remain under ignored `test-results/`. They are excluded from committed evidence. References to those diagnostic filenames below identify these private local copies. This committed folder contains screenshots, computed metrics, diagnostic source and this ledger, with no login file.

The final source pipeline passed lint, 160 unit tests and the production QA build (including TypeScript), as recorded by the coordinating agent. This folder records the subsequent actual browser result separately.

## Final serial Edge run

Command: `playwright test tests/e2e/academy-portal.spec.ts --reporter=line`, using the final `.next-gallery-qa` production build on isolated port 3001. One worker; normal Edge; normal `bringToFront` before UI phases; no concurrent build, lint or unit test jobs. Browser/server completed and port 3001 closed.

Result: **1 passed, 1 failed (1.6 min)**.

- Passed: batch-only monthly report preparation, approval, private parent PDF and actual parent Reports at 390 and 320 px. No individual plan was created, and missing individual observations remained explicit. Files are in the parent folder.
- Failed: the comprehensive portal flow timed out at the first normal Fee Plans click, before any finance editor was opened. Backend setup, permission checks, shared training/weekly/monthly preparation and the first private monthly PDF completed before that point. The remaining UI finance, role-navigation, seven-screen capture and server-restart assertions were not reached.

The browser finance GET returned HTTP 200 in 47 ms. Its request started about 145 ms after the click began. At the 15-second click timeout, the last painted frame still showed “Loading authorised fee records…”, while the later teardown DOM snapshot contained the complete Fees controls. There was no visible overlay. The sole console resource error was the existing favicon 404. The cause remains unresolved; a fast API response does not establish browser readiness or a passing customer workflow.

`final-fee-plans-trace.zip`, `final-fee-plans-error-context.md` and `final-fee-plans-last-frame.jpeg` preserve that run. The trace recorded viewport 1280 × 720; its internal screencast frame is 800 × 450. Do not treat the scaled screencast frame as a requested native-resolution reference comparison.

## Preliminary run

`initial-fee-plans-*` preserve the earlier failure at the same interaction. That run overlapped other source checks; it is retained for diagnosis, not represented as a valid final acceptance run. Its last paint showed the earlier onboarding page while the DOM snapshot showed Fees.

## Remaining verification

The full finance browser workflow, seven-screen desktop/tablet/mobile captures, source-reference comparisons and integrated restart acceptance remain pending. The passed unit tests and the separate passed monthly case do not grant visual approval.

## Bounded renderer diagnosis after the final failure

Three normal, single-page diagnostic runs passed: Edge Home to Fees (31.0 s), Edge actual onboarding to Fees (35.3 s), and bundled Chromium actual onboarding to Fees (46.1 s). Each waited for the actual successful finance GET, recorded DOM/computed bounds, tested a native animation frame and took an actual screenshot before a normal Fee Plans click. Both engines were visible/focused, received a native animation frame and had a normal enabled tab. No page errors occurred. Chromium initially reported fonts loading; its mobile capture reported fonts loaded. No security flags or force-clicks were used.

The Owner shell skip link was fixed at top=-80 px in both engines and at 390 px. This does **not** explain the visibly misplaced link in the Parent Reports captures; that separate computed-style check remains pending.

The master test now explicitly waits for the actual finance GET 200 and for the fee loading text to disappear before its existing normal click. Its 15-second action timeout and functional assertions remain unchanged. The earlier auto-wait stall has not been assigned a proven root cause. An integrated rerun on the final source build remains required.

Diagnostic JSON and PNGs are in `msedge-renderer/`, `msedge-onboarding-renderer/` and `bundled-chromium-onboarding-renderer/`. The bounded diagnostic source is archived as `renderer-diagnostic-source.ts.txt`, outside test discovery. The first diagnostic attempt returned 400 during fixture creation because the temporary setup omitted required contact/accent fields; those fields were corrected before the three browser diagnosis results above.

## Subsequent master run: invoice field label

The next master run passed the first Fees readiness check, opened Fee Plans and saved the actual monthly fee plan through the UI. It then timed out selecting the invoice Player field with its exact accessible label. The actual screenshot and DOM show a fully painted invoice editor with the expected player options and selected child. The wrapping label also contains option text, so the source was corrected to give all five native finance editor selects concise explicit aria-labels matching their visible labels. Exact test selectors and normal interactions were retained. Successful GET/loading readiness was applied consistently to the later Fees route changes, reloads and captures.

This run completed **1 passed, 1 failed (2.2 min)**. The independent batch-only monthly approval/PDF/mobile report case passed again. Its refreshed 390 px actual image also confirms the hidden skip link, Home/Progress/Messages/More navigation order and green source-focus treatment. `invoice-dialog-trace.zip`, `invoice-dialog-error-context.md` and `invoice-dialog-last-frame.jpeg` retain the new failure. The full finance workflow and seven-screen comparisons remain pending a production rebuild with the select-label correction and another master run.

## Subsequent master run: current development-plan focus

With concise select labels, the actual finance workflow passed plan/invoice creation, rejected-save draft retention and retry, pending-reference semantics, verification, private parent receipt PDF and denied Coach/other-family access. Coach Home and Calendar opened the same persisted Training session. The next failure was Parent Home lacking the authorised development-plan focus text. Its weekly card correctly excluded the published next-week snapshot and showed Awaiting coach approval for this week. The future plan remains future; the test dates and focus assertion were preserved. The source correction adds the independently authorised current development-plan focus to the existing compact footer, and the test additionally checks that the weekly date label and placeholder heading still exclude next week's snapshot.

This run completed **1 passed, 1 failed (2.0 min)**. The batch-only monthly case passed again. The real verified receipt is saved as `verified-academy-receipt.pdf`; `parent-current-plan-last-frame.jpeg` captures the missing-focus state. Raw traces/error context remain in ignored local diagnostics. The seven-screen capture loop and final restart assertions were not yet reached.

## Complete capture and restart pass, with responsive failures retained

Normal bundled Chromium on build 58115 completed the finance UI/permissions, parent approved-content boundary, all 40 viewport image pairs and two fresh server reads of the persisted academy/finance records. Literal page errors and external browser requests were empty. The overall master case still correctly failed on eight document-overflow cases: Players and Fees at 768/390/320 px, plus Parent Fees at 390/320 px. The independent monthly case passed. The aggregate run took 2.9 minutes.

The test records every image/measurement before asserting the overflow list is empty. This collects all responsive defects without accepting any of them. Its ignored review-login file was not written because the final assertion failed. All 83 top-level PNG/manifest files from that baseline are preserved in `../baseline-58115/`. The current source correction remains pending the next coordinated build and rerun. No design approval is implied.
