# Add and Edit Player simplification

30 October 2026 Git snapshot: this save also includes the preserved earlier screenshots and untracked project evidence requested by the user. The exclusion statement at the end describes the original scoped implementation checkpoint. Fresh lint, typecheck and all 269 unit tests passed for this save; browser results below remain the earlier recorded runs.

Implementation ready for review; visual approval remains with the user. Based on `a4c0869` on `codex/simplify-player-form`.

The shared authenticated form now keeps age category independent of actual training placement. Batch Label is removed from Add/Edit; legacy labels are preserved in storage. Training batch uses configured batch IDs and displays **Not assigned yet** when there is no recorded assignment. Position is optional, with the requested football choices, **Not decided yet**, and an exact compatibility choice for older free text. The directory filters and player profile use the same choices and unset labels. CSV import is unchanged.

Untouched roster-only, unavailable and historical assignments remain intact. Only an explicit reviewed owner/admin placement change updates current rosters; historical session rosters never change. Existing coach, parent, academy, record-version and placement-review checks remain enforced.

## Actual browser evidence

| Screen | Desktop | Mobile |
| --- | --- | --- |
| Add Player | [Before](before/add-player-1440.png) · [After](qa/add-player-1440.png) · [Comparison](add-player-comparison-1440.png) | [390 px](qa/add-player-390.png) · [320 px](qa/add-player-320.png) |
| Edit Player | [Before](before/edit-player-1440.png) · [After](qa/edit-player-1440.png) · [Comparison](edit-player-comparison-1440.png) | [390 px](qa/edit-player-390.png) · [320 px](qa/edit-player-320.png) |
| Player Profile | [Before](before/player-profile-1440.png) · [After](qa/player-profile-1440.png) | [390 px](qa/player-profile-390.png) · [320 px](qa/player-profile-320.png) |

1536 px captures and mobile comparisons are included alongside these files. These are actual authenticated browser captures on isolated fictional accounts, with 60 original players, legacy text, assigned and unassigned batches. They are not screenshot-based interfaces. The existing two-column desktop form and single-column mobile form are retained. Long mobile forms remain scrollable; the browser case verifies that the Save action is reachable. No layout approval is claimed.

## Verification

- Full lint, typecheck and production QA build passed. The separate `.next-player-form-qa` output protects the existing local app's assets.
- Full unit suite: **269 tests in 28 files passed**, including 20 player configuration/placement tests.
- New authenticated browser scenario: all 14 requested player cases passed, including actual API persistence, reload, legacy values, filters, current and historical rosters, foreign academy and role denial, stale versions, and 1536/1440/390/320 px usability. [Verification manifest](qa/verification.json).
- Existing regional workspace/parent-report/conversation browser case passed after replacing the removed Batch Label test input with the real optional batch dropdown.
- Existing Academy master flow, batch-only monthly report/PDF, Calendar/Training scheduling and Settings browser regressions all passed. Six distinct browser cases passed across the targeted runs.
- Existing renderer unit helpers log two `fetch failed` messages while their assertions pass; actual authenticated PDF regression is separate. The production build retains the existing dynamic SQLite-path tracing warning.
- [Read-only source preservation](source-preservation.json): all **1,442 historical record bodies** match their earlier hashes. The original academy retains 60 players and 180 reports; the newer academy's 60 players and subsequently created reports are retained. No customer database was reset or seeded during this implementation.

Initial browser failures used `getByLabel` on wrapped selects; the tests now use their actual accessible combobox roles and names. No product assertion was removed.

The larger Academy case once timed out waiting for a post-restart reload and passed unchanged on rerun. The Calendar test changed several URL filters before the previous navigation settled; it now explicitly checks each real URL transition, then retains all original event-count, back/forward, history and privacy assertions. The corrected case passed.

All 33 initially modified files match their saved SHA-256 hashes. Older regression helpers regenerated 20 pre-existing screenshots/PDFs; their regenerated copies were saved separately and the originals were reconstructed from the initial binary checkpoint, hash-verified, and restored. See [worktree preservation](worktree-preservation.json). New captures remain under this task's evidence folder.

## Files and boundaries

Product changes are limited to `portal-players.tsx`, `player-form-options.ts`, `portal-records.ts`, `workspace-schemas.ts` and `workspace-service.ts`. Other changes are isolated QA build configuration, focused tests and this browser evidence. No schema migration, main merge, deployment or external delivery was performed. The user's initially modified files and unrelated untracked work remain outside the commit.
