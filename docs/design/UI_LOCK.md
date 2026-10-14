# Sportozen approved visual direction lock

## Scoped Home update — 15 October 2026

The latest explicit user instruction authorises implementation of the supplied Home dashboard on `codex/home-screen-locked-ui`. For `/design-preview/coach-today`, [home-screen.png](../reference/approved-ui/home-screen.png) is now the visual source of truth and supersedes the older Coach Today panel below. The actual 1536 × 1024 attachment was opened and preserved byte-for-byte; its provenance and asset crops are recorded in [UI_REFERENCE_MAP.md](UI_REFERENCE_MAP.md) and `docs/reference/approved-ui/home-assets.json`.

This override is limited to the Home composition, cards, existing action navigation, compatible honest states, responsive adaptation and relevant tests. Keep other screens—including Players, its details, Parent Home and Player Profile—unchanged. Reuse the approved navigation visually within Home without letting Home-specific styles drift into unrelated screens. Preserve uncommitted work, authentication, academy scope, existing data/services/schema, batch-plan inheritance, player/session context and report approval/publication rules. Reference examples do not grant finance access or establish real payments, attendance, messages or player scores.

Implement the Home reference as real components and editable controls. Use the supplied text-free football-photo crop, configured academy branding, readable workflow counts, contextual links and a compact fictional-data notice. Keep development controls in the closed existing developer panel or gallery. Do not introduce a standalone Drills Library, alternate dashboard application, backend/API/provider work, or screenshot hotspots. AI Video Analysis remains **Coming soon**.

Capture the current Home before editing; verify the corrected 1536 × 1024, 1440 px, 390 px and 320 px views, honest no-session/loading/error states and unrelated-screen regressions in the isolated QA environment. Inspect actual browser/reference comparisons and record remaining differences in [Home evidence](../screenshots/home-ui/README.md). The user has selected this reference, but the implementation still requires their visual approval. Prepare the requested reviewable pull request; do not merge, deploy or continue redesigning other screens. The older correction checkpoint below is historical and does not restrict this newly authorised Home task or confer implementation approval.

The user has selected the reference visual direction. The current Coach Today / Parent Home implementation is a correction checkpoint and requires separate user review. **Implementation ready for visual review** and **user-approved design implementation** are different states. Tests, screenshot generation, this document and agent conclusions do not grant user approval.

## Visual source of truth

Use these named references, opened and mapped in [UI_REFERENCE_MAP.md](UI_REFERENCE_MAP.md):

- `docs/reference/approved-ui/screens/01-coach-today.png`
- `docs/reference/approved-ui/screens/02-player-profile.png`
- `docs/reference/approved-ui/screens/03-parent-home.png`
- `docs/reference/approved-ui/original_boards/01-approved-coach-player-parent-board.png`

The accessible images were preserved from the supplied gallery and original board. The requested ZIP was unavailable; do not claim it was opened or extracted. Older exploratory mockups, text descriptions such as “premium” or “Concept B”, and the generic design-preview catalogue do not supersede these selected images. Do not mix alternate panels into a new interface.

Match the actual screen composition with editable React components, text and working controls. A whole reference screenshot with clickable hotspots is not an implementation. Presentation phone frames, exterior board backgrounds and captions do not belong inside the product.

## Rules for later feature and backend work

- Backend, data, provider and feature tasks must preserve this visual direction rather than redesigning the interface.
- Do not change primary navigation, typography, spacing, card structure, icon treatment, button hierarchy or academy branding without explicit user approval. The current task explicitly defers the standalone Drills Library from primary navigation while preserving activity records and their session/plan links.
- New screens must reuse the approved components and visual rules. Propose a necessary new pattern in a scoped preview and obtain visual approval before expanding it across screens.
- Changes to shared visual components require regression screenshots of Coach Today and Parent Home at the tested desktop/mobile sizes, plus any affected views. Functional tests alone do not establish visual fidelity.
- Actual data may change names, counts, dates and text. Keep layout stable with realistic long/empty content, and preserve the approved hierarchy instead of restyling around one fixture.
- Fixture, role, scenario, reset and gallery controls belong in a separate gallery or accessible developer drawer closed by default. Legitimate authorised child or academy selectors belong in the product context. Keep one compact, readable fictional-preview notice.
- Preserve keyboard access, visible focus, drawer focus/escape/return behaviour, readable text and usable touch targets. Do not trade away accessibility to match an image.
- Verify font/image loading and document substitutions or low-resolution crops. Do not invent unsupported fidelity percentages or claim “pixel-perfect”.
- Never infer user approval from passing tests, a saved commit, an agent's visual inspection or absence of user criticism. Record explicit approval and its scope separately.

## Product rules that stay fixed

Sportozen remains football-only with independent academy customers. Batch plans are the default; selected-player/group personalisation is optional. Preserve calendar, players, sessions, attendance, messages, reports, fees, weekly parent updates, monthly report cards and parent-supported practice. Preserve academy branding, authorisation, guardian/player relationships, records, snapshots and conversations. AI Analysis remains **Coming soon**; no rankings or universal talent scores.

Approval and sharing/publication remain separate actions. Preview payment and WhatsApp states are fictional and disconnected; generated artwork cannot establish a live integration, payment or delivery. Do not copy fabricated scores, verification marks, signatures, QR codes or live-provider claims. Customer routes use authorised records and server scope checks; never replace authenticated pages with fictional preview fixtures.

## Current checkpoint and stopping rule

Branch: `codex/locked-ui-fidelity`, continuing the newer frontend commit `748d023f756de899c58e2b5226eb39293db6a813` while preserving pre-existing uncommitted work. Correct only `/design-preview/coach-today` and `/design-preview/parent-home`, including responsive behaviour. Keep Player Profile and the other screens accessible and unchanged except for unavoidable, tested shared dependencies. Do not start a new catalogue, Figma reorganisation, backend work, migration, provider integration, merge to main or deployment.

Capture the implementation before edits. Capture the corrected Coach Today at 1440 px; Parent Home at 390 and 320 px; and desktop-parent/mobile-coach adaptations. Record viewport heights, route, tested branch and exact commit. Compare relevant source screen crops with actual browser captures, inspect differences and correct major composition/spacing/type/image issues. Use the existing isolated QA setup; never reset customer data or stop an unrelated server.

Deliver files changed, before/after screenshots, reference/implementation comparisons, remaining differences and applicable lint/typecheck/unit/frontend/build/regression outcomes. Stop after these two screens for user approval. Applying these rules to the remaining screens is a later, explicitly approved task.

**Implementation review status:** implementation ready for visual review of Coach Today and Parent Home. Tested product commit: `ef9cce5dc6e154a6340724bff25d16952bc82ccb` on `codex/locked-ui-fidelity`. Actual before/after captures, reference comparisons, responsive sizes, remaining differences and test results are recorded in [locked-ui/README.md](locked-ui/README.md). No approval of the corrected implementation is recorded here. Stop at this checkpoint until the user reviews these two screens.
