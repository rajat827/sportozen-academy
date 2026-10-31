# Sportozen gallery prototype

Local branch: `codex/gallery-working-prototype`, continuing `codex/approved-ui-visual-correction`. The supplied `C:\Users\rajat\Downloads\Sportozen_UI_Gallery.html` was opened, its 34 embedded reference panels were decoded and inspected, and its original copy and inventory were saved under `docs/reference/ui-gallery/`.

Open `http://127.0.0.1:3000/design-preview/prototype`. The launcher maps all 34 panels to working preview routes; alternate artwork and the earlier storyboard share the corresponding current workflow rather than creating independent duplicate products. Reference pictures on the launcher are explicitly labelled artwork. The working pages are React components, editable text, forms, links and media controls, with no full-reference screenshot or hotspots behind them.

## Implemented UI

- Coach Today and Parent Home retain the supplied approved-anchor composition and connected controls.
- Player Profile now follows the gallery's white top bar, roster/search, portrait, tabs, metadata tiles, four development cards and timeline. The supplied portrait is an illustration; age, foot, position and unrecorded history stay missing.
- Weekly Plan uses three columns for shared plan/sessions, optional player adjustments and parent wording preview. The shared focus is edited explicitly; changing it invalidates current wording approval. Review and parent-app publication remain separate steps.
- Parent weekly plan uses the supplied training illustration, team focus and functional Sessions / child-focus tabs. Mapped parent workflows share a compact header, linked-child context and five-item bottom navigation.
- Supporting workflows retain their real adapter-backed actions with compact typography, navy navigation, light cards, green focus areas and usable controls. Player Open and report Review select the clicked row's child; drill detail keeps the chosen activity's instructions; practice requires approval and publication for this child and week.
- New local evidence library/viewer accepts an image/video from the user's computer, previews it locally and saves a player-scoped coaching note. No file is uploaded. Media must be reselected after reload; metadata/notes live only in the preview adapter.
- New activity summary derives counts from the actual fictional roster/attendance/review state. No fake revenue trend or talent ratings.
- Monthly report notification is a disconnected visual preview; an unreviewed child report cannot produce an approved announcement.

The new four preview routes supplement the previous 121-screen inventory. Authenticated customer screens, services, schemas and databases were not changed. Local tests use the existing isolated QA database and transport doubles.

## Differences retained deliberately

This is working frontend workflow coverage for the gallery, not a claim that all 34 historical panels are pixel-identical. The three visual anchors are the main composition references; earlier concepts use current workflow rules and shared styling. The detailed report keeps its reviewed document structure; alternate coach-home/fee-home artwork maps to the corresponding current session/fee views. Unknown provider logos, live payment/delivery indicators, fabricated 8.2/10 scores, QR URLs, roster totals and historical performance claims are not copied as product facts. Source fixture names, dates, session counts, reviewed observations and academy accent remain authoritative.

Small supplied image crops are low resolution and may soften at desktop size. The editable circular S mark and local Noto Sans are retained because no logo vector or exact reference font was supplied. The independent child-account concept is represented by parent-supported practice. The drill editor remains the existing generic fictional draft form; chosen activity details work, but editing that form does not rewrite the source drill curriculum.

No Figma frames were authored in this iteration. The previous authorised account's Starter MCP quota blocker remains recorded in `docs/design/FIGMA_LEDGER.json`; this request was implemented as a local browser prototype. No new node/file links are claimed. No merge, push or deployment was performed. Visual approval remains with the user.

## Verification

TypeScript, full ESLint and all 64 unit tests passed before final browser QA. Production/browser outcomes and actual captures are recorded below when complete. The first Turbopack QA build was stopped after repeated filesystem updates/paging; a sandboxed Webpack build encountered EPERM writing generated output, then the scoped local QA build was retried with its workers permitted to write inside the repo. Neither event changed customer services or data.

Final results: production Webpack build and strict TypeScript passed using the fresh `.next-gallery-qa` artifact, an isolated QA database and one page-generation worker. Full ESLint and all 64 unit tests passed. All 33 distinct browser cases passed across the main run and focused repair run (25 unaffected cases plus eight repaired/additional cases). Those include the complete 125-view inventory at 1440/390 px, all 31 gallery routes at 1440/390/320 px, 320/768/1024/1440 weekly layout, actual PDF/media controls, approval/publication, child context and customer regressions. No business API calls were made by gallery prototype flows.

The first browser run found the missing profile preview notice, a test that needed to open the new child-focus tab, and a 4 px overflow from negative header margins. These were corrected. A diagnostic-output collision and a build attempted before the QA server had fully stopped invalidated two test artefacts; those customer checks were rerun independently and passed. Windows also retained a generated-output lock, so a fresh QA folder was used without deleting that locked directory. Customer services and data were not changed.

There are 96 actual browser captures in `screenshots/`: 31 gallery routes plus the launcher, each at 1440, 390 and 320 px. Five side-by-side comparisons (Coach Today, Player Profile, Parent Home, Weekly Plan and Parent Weekly Plan) pair the supplied reference with the actual browser and recorded differences. All five were inspected; passing checks does not establish visual approval.

## Changed files

- `src/app/design-preview/prototype/page.tsx`; `prototype-gallery.tsx/.css` and `gallery-catalog.ts`: launcher and 34-reference mapping.
- `gallery-player.tsx/.css`, `gallery-plan.tsx/.css`, `gallery-parent-frame.tsx/.css`, `gallery-operations.tsx/.css`, `gallery-evidence-adapter.ts`, `gallery-shell.css`, `gallery-workflows.css`: component views, local media adapter and scoped styles under `src/features/design-preview/`.
- `preview.tsx`, `approved-homes.tsx`, `catalog.ts`: preview-only dispatch, navigation, notice and four added views.
- `management-screens.tsx`, `coaching-screens.tsx`, `parent-screens.tsx`, `report-screens.tsx`: row-context, selected-drill, practice-publication and per-child report fixes.
- `tests/e2e/gallery-flows.spec.ts`, `gallery-prototype.spec.ts`, `gallery-layout.spec.ts`; adjusted `design-preview.spec.ts` and `approved-visual.spec.ts` for the intentional edit/tab interactions.
- `next.config.ts`, `playwright.config.ts`, `tsconfig.json`, `.gitignore`: isolated QA output/worker support; ordinary dev/customer configuration stays unchanged.
- `public/design-preview/ui-gallery/`, `docs/reference/ui-gallery/`, `docs/design/gallery-prototype/`, `docs/design/SCREEN_MAP.md`, `scripts/gallery-comparisons.py`: supplied artwork/provenance, actual captures and comparison generation. Original HTML SHA256: `5DC24C3F97BE0AA38BB26FFCB3A572264EAA4EE64C69152B050E9E57214B0358`.

Pre-existing untracked `docs/screenshots/qa-communication-phone.png` remains preserved and excluded from this work. Earlier capture directories were restored after regression generation; new gallery captures are kept separately. The pre-existing generated `next-env.d.ts` dev imports are retained outside this commit.
