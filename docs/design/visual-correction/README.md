# Approved-reference visual correction — awaiting user approval

Scope: **Coach Today desktop and Parent Home mobile only**. Branch `codex/approved-ui-visual-correction`, based on `e38b97b` from `codex/frontend-figma-design`; remote and local frontend heads matched. Pre-existing untracked screenshot preserved. Other 119 screens retain their previous renderer and styles. Non-default shared-state examples also retain the existing renderer.

The supplied reference was opened and inspected, then copied unchanged to `docs/reference/approved-ui/Sportozen_Approved_UI_Reference.png`. Its desktop Coach Today and top-right Parent Home panels are the comparison sources. Device frames, status bars, presentation captions and other panels are excluded from the implemented UI.

The new UI uses real text, links, icons, selects and cards. There is no screenshot background or hotspot layer. Existing typed fixtures and the session adapter supply academy identity, selected child, batch/week schedule, inherited focus, optional adjustment, approval/publication status, report state and counts. Profile menus retain preview context/reset/gallery controls. Parent selectors remain limited to linked children; an unlinked selection retains the existing scope guard. Changed source content is not presented as an approved parent plan. Missing sessions and updates remain missing.

## Routes and captures

- `/design-preview/coach-today`: `coach-today-1440.png`; additional `coach-today-320.png`.
- `/design-preview/parent-home`: `parent-home-390.png`; additional `parent-home-320.png`.
- `parent-home-320-bottom.png`: actual scrolled browser viewport proving the shortcuts remain reachable above the fixed navigation.
- `coach-comparison.png` and `parent-comparison.png`: approved reference / actual browser implementation / remaining differences, with both panels rendered at comparable widths.

## Remaining differences to review

- The reference uses Stallions/Rahul/Ananya and January data. The implementation retains Riverside/Maya/Neha, recorded U10/October fixtures, two confirmed sessions and actual prototype counts. It does not invent four sessions, 12 players, unread messages or child performance results to match the illustration.
- Football imagery is a crop of the supplied reference: 191×290px for the desktop player and 50×84px for the parent illustration. These are illustrative assets, not evidence or photographs of the selected fixture child. Original high-resolution football imagery and separate background/cutout assets were not supplied. The desktop crop has a narrower field background and clips the outstretched arm; upscaling is visible. No generated substitute was used.
- Avatars use initials rather than assigning the reference's unidentified portrait photographs to different fictional people. The Sportozen mark is editable text in a circular treatment, rather than a separately supplied vector logo.
- Noto Sans is retained from the existing licensed local font assets. Reference font metadata was not supplied; weights and hierarchy are matched by visual inspection rather than claiming an exact font match.
- The handwritten hero slogan is omitted; a separate source font/asset was not provided. The reference's outer presentation captions and device frames are excluded as requested.
- Parent child selection and the small fictional-preview notice remain for truthful, usable review. Longer source-based focus/update text changes some wrapping and card height. Profile menus provide review controls without a large testing toolbar in the main composition.
- The primary action uses the existing validated academy accent, preserving academy-specific branding and readable white-label contrast; Riverside's button is darker than the reference's bright gradient.
- AI Analysis remains Coming soon. There are no new live payment or WhatsApp states.

## Figma

Authoring was rechecked on the authorised existing destination `IOvXhhYikQH0zE04vBvNCP`. `get_libraries` still returns Starter MCP tool-call quota exhausted. No corrected editable frames were saved, and no new file/node links are claimed. The previous empty-file ledger remains accurate.

## Verification

Production build and TypeScript validation pass, with the inherited dynamic SQLite filesystem-tracing warning. ESLint passes without errors or warnings. All 64 unit tests and the full 27-case browser regression suite passed during this correction. After the final parent typography/menu polish, four focused workflow/layout cases passed; the final capture/context/missing-data/320px-reachability case also passed after the last label correction. These include role/scenario menus, linked-child switching, source invalidation, private report/feedback/payment workflows and existing drawer keyboard behavior. No customer API calls occurred in the two-screen capture test. All final comparison images and native captures were visually inspected.

Functional checks do not establish visual approval. This iteration stops for user approval after these two screens; no backend work, customer-screen replacement, database reset, merge or deployment. The reference copy's SHA-256 matches the supplied file: `77B84EE1AE4DD046EDA758567F2BBAFC43767D4977384C223E1283FA4F0CA250`.

## Changed source files

- `src/features/design-preview/approved-homes.tsx`: isolated composition and connected controls for these two routes.
- `src/features/design-preview/approved-homes.css`: isolated reference-based layout, typography, imagery and responsive rules.
- `src/features/design-preview/preview.tsx`: selects the new renderer only for the two default-state routes and valid scope.
- `public/design-preview/approved-ui/`: two supplied-image excerpts used as ordinary image assets.
- `tests/e2e/approved-visual.spec.ts`: captures, 320px checks, source invalidation, context and navigation coverage.
- `tests/e2e/design-preview.spec.ts`: updates the two greeting expectations and checks the academy fee on its existing fee route.
- `docs/reference/approved-ui/` and this directory: original reference, panel crops, actual captures and review comparison.
- `docs/design/SCREEN_MAP.md`: records the two corrected capture overrides while preserving the earlier full-inventory baseline.
