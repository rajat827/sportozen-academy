# Approved Home dashboard implementation evidence

Task date: 15 October 2026. Branch: `codex/home-screen-locked-ui`. Product commit: `d20f1a70aaec602ea6c25e065aca528bed1d94a3`. Route: `/design-preview/coach-today`. Status: implementation and the 11 distinct focused browser cases are ready for visual review; these cases passed across the recorded runs. No user visual approval is recorded.

## Scope and preservation

This iteration implements only the supplied Home dashboard in the existing isolated frontend preview. It covers composition, cards, navigation into existing workflows, honest states, responsive behaviour and relevant tests. Players, player details, Parent Home and the remaining screens are preserved. No customer fixture substitution, server service, API, schema, database reset, messaging/payment integration, main merge or deployment is authorised. Existing uncommitted work is preserved.

The latest Home reference overrides the historical Coach Today reference for this route only. The selected visual source does not establish approval of the rendered implementation. See [UI_LOCK.md](../../design/UI_LOCK.md) and [UI_REFERENCE_MAP.md](../../design/UI_REFERENCE_MAP.md).

## Actual reference and asset provenance

The task attachment `C:/Users/rajat/AppData/Local/Temp/codex-clipboard-5c436cb6-8c64-4a56-993a-d51d3097a8ce.png` was opened and visually inspected. It is the supplied Home dashboard, 1536 × 1024 pixels. It is saved unchanged as [home-screen.png](../../reference/approved-ui/home-screen.png), SHA-256 `12C77B9DDD8645E2F9E3884A682DD166A63EDFB55D5AF044C3F15D3B93AB8CD0`.

The source image depicts an approximately 248 px deep-navy sidebar, compact header, greeting/date row, football hero/schedule row, four summary cards, compact activity/pending/quick-action row and focus/report/planning bottom row. Editable React content and CSS layout implement this composition. The full reference is evidence, not a product-screen background or hotspot surface.

| Extracted asset under `public/design-preview/approved-home/` | Crop coordinates `(left, top, right, bottom)` | Pixels | Intended use |
| --- | --- | --- | --- |
| `sportozen-mark.png` | `(25, 17, 65, 65)` | 40 × 48 | Supplied Sportozen mark; brand text stays editable. |
| `riverside-crest.png` | `(16, 98, 70, 154)` | 54 × 56 | Supplied Riverside crest, only for the corresponding configured fictional academy. |
| `football-session.png` | `(610, 157, 1031, 421)` | 421 × 264 | Text-free boots-and-ball action photograph from the reference hero; CSS blends the dark text area to its left. |
| `player-portrait.png` | `(300, 872, 383, 970)` | 83 × 98 | Supplied fictional Aarav portrait, only for that corresponding preview illustration. |

Crop edges use PIL conventions: the right and bottom coordinates are excluded. The full crop inventory and each asset hash are recorded in [home-assets.json](../../reference/approved-ui/home-assets.json). All four extracted images were opened and visually inspected. No new generated concept image, invented crest or unrelated photograph replaces the main artwork.

The user supplied these raster pixels for the requested local preview. No independent stock licence, exact font identification, vector logo or original high-resolution photograph was supplied. The crops retain their navy/background pixels and may look softer at enlarged sizes. This provenance is not a claim of independently verified commercial asset licensing or real player identity.

## Actual browser evidence

The baseline [capture manifest](before/capture.json) records the previous product commit `ed53d8c4641d7efa8add54d33d59a176be69e9a0`: Home at 1536 × 1024, 1440 × 900, 1280 × 900, 390 × 844 and 320 × 844, plus Players and Player Profile at 1440 × 900 and Parent Home at 390 × 844.

The new captures use normal Microsoft Edge through the repository's isolated Playwright QA server on port 3001. The server uses a dedicated `.local/e2e-*.sqlite` database; the preview makes no business `/api/` requests. No customer database was reset. No browser-security, operating-system or network-policy settings were changed.

| Actual viewport | Window capture | Full-page capture |
| --- | --- | --- |
| 1536 × 1024 | [Desktop](after/home-1536.png) | [Complete dashboard, 1536 × 1060](after/home-1536-full.png) |
| 1440 × 900 | [Desktop](after/home-1440.png) | [Complete dashboard](after/home-1440-full.png) |
| 1280 × 900 | [Desktop](after/home-1280.png) | [Complete dashboard](after/home-1280-full.png) |
| 768 × 1024 | [Tablet](after/home-768.png) | [Complete dashboard](after/home-768-full.png) |
| 390 × 844 | [Mobile](after/home-390.png) | [Complete mobile dashboard](after/home-390-full.png) |
| 320 × 844 | [Narrow mobile](after/home-320.png) | [Complete narrow dashboard](after/home-320-full.png) |

All six widths passed the Home composition test, including horizontal-overflow checks, loaded hero imagery, the configured Noto font family, closed developer controls, mobile touch targets and pending/quick-action order. [Measured browser bounds](after/capture.json) show a 248 px desktop sidebar, a 754.875 × 266 px hero and 463.109375 × 266 px schedule at 1536 px, aligned at `y = 154.5`.

Relevant states were captured at both 1536 and 390 px:

- Genuine no-session day, 21 October: [desktop](after/home-no-session-1536.png), [mobile](after/home-no-session-390.png).
- Empty fixture: [desktop](after/home-empty-1536.png), [mobile](after/home-empty-390.png).
- Loading: [desktop](after/home-loading-1536.png), [mobile](after/home-loading-390.png).
- Failure: [desktop](after/home-error-1536.png), [mobile](after/home-error-390.png). The canonical route is `?scenario=failed-save`; the screenshot filename describes its displayed error state.

The loading/failure views keep the shell and use unavailable values rather than presenting zero as successfully loaded data. The real no-session test retains the recorded upcoming session and then opens the correct 22 October session. Calendar navigation also switches correctly from Thursday, 22 October, back to Tuesday, 20 October, without replacing Aarav's context.

## Reference comparison and remaining differences

- [Approved reference / actual 1536 × 1024 browser window](reference-versus-actual-1536.png), with [pixel dimensions and hashes](reference-versus-actual-1536.json).
- [Approved reference / complete actual desktop page](reference-versus-actual-1536-full.png), with [dimensions and hashes](reference-versus-actual-1536-full.json).

Both images use native 1536 px product widths. The longer actual full-page capture remains visible; it is not cropped or stretched to hide its extra height. The generated comparison is review evidence and is not used by the application.

The desktop sidebar, header, hero/schedule proportions, four-card summary, three-column supporting row and bottom focus/report/planning row follow the supplied composition. The actual desktop and mobile captures were opened and inspected. Remaining differences are explicit:

- Existing self-hosted Noto Sans is retained; no original editable font specification was supplied. Some text metrics and line wrapping differ from the raster reference.
- Existing fictional records change names, counts, batches, venues and labels. The default coach is Maya Rao, the selected batch is U10 Foundations and the academy location falls back to its recorded country, India. The source's example identities and city are not substituted for those records.
- Only one current-day accessible session and two recorded activity/pending entries exist. Cards retain their layout instead of fabricating extra sessions, fees or activity to fill space.
- There are no recorded October reports, so the current-month donut is empty and its text values are zero. The September source period is labelled separately. The source's decorative 8/12 report count is not copied.
- Unread state is not recorded by the existing adapter. The summary uses a dash and says so; stored parent-question counts are identified separately. There is no unsupported unread badge or artificial monthly growth.
- Finance navigation and Add Player are disabled for the coach preview. The permission explanation occupies some space beneath the quick-action tiles.
- The supplied boots/ball crop is used and blended into the dark hero. Its raster edges, resolution and overlay differ slightly from an original standalone photograph. At 320 and 390 px the responsive cover crop retains the boots but shows only part of the football; review this crop in the actual mobile captures. The supplied portrait is explicitly illustrative and only used for the corresponding fictional player.
- Compact data explanations and longer recorded text move the bottom row slightly and make the full desktop page 1060 px high. The compact fictional-data notice remains below the product content. Mobile is a responsive adaptation of this desktop reference; no separate approved mobile Home image was supplied.

No similarity percentage, “pixel-perfect” claim or implementation approval is inferred.

## Verified interactions and operational boundaries

The completed Home navigation case verifies Start Session, the scheduled row, Calendar, Players, report review, Add Session, Send Message, Generate Report and next-week planning. Session actions open existing workflows and preserve academy, player, batch and date; they do not create or complete a session. Review opens the correct draft player's queue context. Send Message opens an empty composer, and Generate Report opens preparation without approving or publishing anything. The keyboard drawer traps focus, closes with Escape or its close button, and returns focus to its trigger.

The no-session/date case also verifies both recorded Calendar entries select their own date after a previous Home selection. Shared context readers reject stale or mismatched session metadata instead of silently showing the default session. Source-level changes to these readers leave the no-context default presentation intact.

Header search has the existing bounded scope: matching player names open the selected profile; session/calendar terms open Calendar; message/parent terms open Messages; other terms open Players. The help dialog explains this scope. It is not a newly implemented global search service.

AI Video Analysis remains **Coming soon**. Finance access and Add Player remain blocked for the coach role. The preview does not send externally, collect payments, publish reports automatically or connect to customer records. Saving, approval, parent-app publication and delivery remain distinct.

## Verification record

For Home product commit `d20f1a70aaec602ea6c25e065aca528bed1d94a3`, the main task verified repository lint, strict TypeScript, **75 unit tests** and the production Webpack QA build. These results apply to the Home commit, not later work on separate screens.

All six new Home browser cases and the five approved/locked compatibility cases have now passed across the recorded runs. The final serial normal Edge run completed **6 passed in 2.3 minutes**: the previously stalled count-consistency case, approved-reference compatibility case, and all four locked UI cases. No parallel build or other browser job ran during this final run. This is a record of 11 distinct passing cases across runs, not a claim that a single uninterrupted 11-case run completed.

The count case verifies 3 players, 2 batches, 2 upcoming sessions, unavailable unread status, zero current-month reports and the actual September 1-approved/1-draft chart. Saving a report draft changes that period to 0 approved/2 draft; saving one prototype parent question changes the separately labelled question count and opens the matching thread. Approval remains separate from parent publication, and the compatibility tests verify the parent screen remains unpublished until the explicit publication action.

Earlier failures remain preserved for diagnosis:

- The initial compatibility run timed out after 15 seconds waiting for the existing Weekly Plan **Save batch plan** button to become actionable; earlier Home/Parent controls and navigation completed. [Failure context](checks/initial-approved-visual-error-context.md) and [trace](checks/initial-approved-visual-trace.zip).
- The first Home-only run passed four cases, then the count case timed out on the closed **Preview tools** trigger after successfully saving the report draft and checking changed counts. The sixth case had not run. [Context](checks/initial-home-counts-error-context.md), [trace](checks/initial-home-counts-trace.zip).
- A separate remaining-case run passed the date-selection case but timed out locating **Coach commentary** after opening the existing report editor. The failure snapshot contains the corresponding textbox. [Context](checks/second-home-counts-error-context.md), [trace](checks/second-home-counts-trace.zip).

The varying actionability/readiness timeouts are not established to be Home code defects. A later preservation run was deliberately stopped when a parallel build was discovered, with no completed case result. The final serial run passed all previously stalled checks after that resource window cleared. This does not establish a root cause for the earlier timeouts. Browser security settings, timeouts and assertions were not weakened; no force-click workaround was added.

The locked composition case verifies loaded fonts and image assets at Home 1440/390 and Parent Home 1440/390/320, with no horizontal overflow. It also checks mobile shortcuts remain above the fixed navigation at the bottom of the page. The other locked cases verify focus containment/return, academy branding, linked-child boundaries, session/player navigation, batch-plan inheritance and the separate approval/publication steps. [Locked capture manifest](regressions/locked-home/capture.json).

A separate one-time preservation capture passed at Players 1440 × 900, Player Profile 1440 × 900 and Parent Home 390 × 844, with loaded Noto fonts, no overflow, no page errors and no business API calls. The directory uses its existing initials, so its expected raster-image count is zero; the profile portrait and parent football asset load normally. An initial capture-helper assertion incorrectly required an image on the directory, and was corrected to its actual existing contract before the successful capture. No product code changed for that correction.

| Preserved screen | Baseline | Home-commit browser result | Native pixel comparison |
| --- | --- | --- | --- |
| Players, 1440 × 900 | [Before](before/players-1440.png) | [After](preservation/players-1440.png) | 1,684 pixels differ, confined to text inside native select controls; the surrounding layout and player records are unchanged. |
| Player Profile, 1440 × 900 | [Before](before/player-profile-1440.png) | [After](preservation/player-profile-1440.png) | Identical pixels and PNG SHA-256. |
| Parent Home, 390 × 844 | [Before](before/parent-home-390.png) | [After](preservation/parent-home-390.png) | Identical pixels and PNG SHA-256. |

See the [preservation font/image manifest](preservation/capture.json), [dimensions, hashes and changed-pixel counts](preservation/comparison.json), and [focused verification record](checks/verification.json). These checks establish preservation and function within their recorded scope; they do not establish visual approval of the new Home dashboard.

The initial normal sandbox could not access localhost sockets, so no test started in that attempt. The subsequent authorised runs use the normal Edge browser outside that socket restriction. The separate Calendar/Settings/Fees and Reports **before** captures completed successfully, but those artifacts belong to their own screen tasks and are not included in this Home evidence bundle.

## Home files changed

The Home implementation commit contains:

- `home-dashboard.tsx`, `home-dashboard.css`, `home-dashboard-model.ts`: the scoped dashboard, reusable card/action pieces, closed review tools, responsive presentation and read-only projection of the existing fictional adapter.
- `preview.tsx`: Home dispatch and selected-session summary titles; `fixtures.ts`, `rows.tsx`, `ui.tsx`, `coaching-screens.tsx`, `management-screens.tsx`: minimal validated session-navigation/context readers.
- `public/design-preview/approved-home/*` and `docs/reference/approved-ui/home-*`: supplied reference and extracted assets/provenance.
- `tests/e2e/home-ui.spec.ts`, Home assertions in `approved-visual.spec.ts` and `locked-ui.spec.ts`, optional output-folder overrides in `design-preview.spec.ts` and `gallery-prototype.spec.ts`, and `tests/unit/home-dashboard.test.ts`.
- `docs/design/UI_LOCK.md`, `UI_REFERENCE_MAP.md`, Home capture/comparison scripts and this evidence folder.

Player and Player Profile components, Parent Home components, authenticated workspace pages, server services, schemas and customer records were not redesigned or replaced. Their baseline captures are retained. No merge or deployment occurred. No pull-request link is claimed until a reviewable pull request exists. The implementation still requires the user's visual approval.
