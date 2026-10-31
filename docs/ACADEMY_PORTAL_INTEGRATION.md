# Academy portal integration map

Latest user brief: final authenticated portal integration, 15 October 2026. Earlier preview-only/per-screen stopping rules are superseded. Approved design rules, privacy, historical data, no real external sends, no merge/deployment remain binding.

Remote references were refreshed successfully with `git fetch origin`; no newer divergent remote branch was found.

## Verified lineage

| Branch | Tip | Unique relationship to integration start d20f1a7 |
|---|---|---|
| `main` | `5e491e6` | HEAD-only / branch-only commits: 36 / 0 |
| `codex/football-session-evidence-workflow` | `3a2f2d3` | HEAD-only / branch-only commits: 22 / 0 |
| `codex/coach-parent-ux-simplification` | `de8ed89` | HEAD-only / branch-only commits: 20 / 0 |
| `codex/weekly-plans-monthly-reports` | `76f5c2a` | HEAD-only / branch-only commits: 14 / 0 |
| `codex/frontend-figma-design` | `e38b97b` | HEAD-only / branch-only commits: 9 / 0 |
| `codex/locked-ui-fidelity` | `ed53d8c` | HEAD-only / branch-only commits: 1 / 0 |
| `codex/home-screen-locked-ui` | `76e62d9` | HEAD-only / branch-only commits: 0 / 1 |
| `codex/settings-screen-locked-ui` | `d20f1a7` | HEAD-only / branch-only commits: 0 / 0 |

All named backend branches are ancestors of the locked-UI/Home source lineage. No bulk merge or duplicate cherry-pick is needed. Main remains the initial empty review baseline. Open PRs #1–#9 form a stack; #8 is the weekly/monthly backend and #9 adds the isolated frontend preview.

## Preserved later work

- Integration starts at d20f1a7 (approved Home source), preserving the entire uncommitted Calendar implementation and existing unrelated files. A tracked binary patch and untracked source backup are retained under ignored `.local/portal-integration-safety/`.
- Home evidence-only commit 76e62d9 remains in its separate review worktree; remote Home currently ends at d20f1a7. It adds no unique application behavior.
- The original isolated Settings presenter/model/tests/evidence remain preserved in `sportozen-settings-ui` as a backup. The authenticated Settings presenter is now integrated in the primary repository through the actual workspace controller, compatible versioned academy configuration service and existing staff/communication/resource workflows. No preview adapter or fictional persistence is used on customer pages; the isolated preview implementation was not bulk-copied over Calendar/controller files.
- Pre-existing next-env edits, qa-communication-phone.png and cancelled Players preparation are preserved.

## Source-of-truth check

The only discovered Downloads archive `Sportozen UI.zip` was opened and all eight entries inspected. It contains tournament mobile frames (Frame 103/109/110/117/131/132/144/145), not the named Approved_Screens set. Its original bytes/manifest/renders are saved in `docs/reference/unrelated-tournament-package/`. The user explicitly confirmed using the seven prior individually attached Academy references and master board. Those remain the approved visual sources; no tournament design is being substituted. This source confirmation does not approve the resulting browser implementation.

## Reuse and completion

- Keep Better Auth and one academy-scoped useWorkspace controller/API/repository/SQLite lineage. Customer views never import previewAdapter or fixtures.
- Preserve training versions, historical roster/agenda/objectives, attendance, coach evidence, weekly approvals/publications, persistent delivery queue and immutable report snapshots/PDF renderer.
- Real finance event/verification/receipt workflow added; Coach and Support finance access restricted at the server.
- Extend real scheduling with explicit resource hierarchy and atomic conflict checks; shared batch defaults remain usable without mandatory child adjustments.
- Calendar combines real batch, coach, status and venue/zone filters in the URL. Selecting a parent venue includes its same-branch descendant zones; stale/cyclic/cross-scope resource links never widen the selection.
- Add compatible academy configuration/profile fields and optimistic versions; preserve existing records.
- Adapt approved screen composition to current authorised records, including honest empty/error states.

Status: the authenticated portal is implemented. Final lint, 175 unit tests across 20 files and the production build/TypeScript pass. All seven authenticated browser scenarios and two focused preview regressions pass across the documented bounded runs. All seven major reference comparisons and Parent Home were opened and inspected. See [verification and evidence](ACADEMY_PORTAL_QA.md). Reference selection is confirmed; design implementation approval and production readiness are not asserted.

## External delivery and collection

The existing persistent communication queue, consent checks, approval history, Meta adapter and worker are retained. The isolated QA academies start with WhatsApp disabled/paused and no academy-bound sender credential reference, verified WABA/phone connection or approved provider templates. Actual delivery remains Not connected / Not sent. Provider-boundary unit tests cover verification, approved exact template content, retry/ambiguous outcomes and signed events without contacting Meta.

Live delivery still requires the correct academy-bound `SPORTOZEN_WA_*` server secret, connected business phone/WABA, approved weekly and monthly templates, verified recipient/consent and current publication/permissions. Sending is separately guarded by `SPORTOZEN_WHATSAPP_SEND_ENABLED`; live mode also requires `SPORTOZEN_WHATSAPP_LIVE_ENABLED`. These were not enabled and no real message was sent. No provider credentials were purchased, fabricated or printed.

Online payment collection is Not connected. Manual references, explicit verification, invoices, immutable receipts, approved adjustments and private in-app reminders operate against actual persisted finance events. The QA records are synthetic; no real charge was made. Unsupported subscription-billing management, academy deletion and verified-payment reversal/refund actions are not represented as working controls.

## Figma access recheck

On 15 October 2026, the authorised Figma account was rechecked with `whoami`, then an actual metadata request for the existing destination `IOvXhhYikQH0zE04vBvNCP`. The destination request was rejected with the Starter-plan MCP tool-call-limit message. No new frames or nodes were authored, and no editable-frame links are claimed. No plan purchase or upgrade was attempted. Local React components and their text remain editable in the repository.
