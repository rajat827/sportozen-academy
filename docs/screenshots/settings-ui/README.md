# Approved Settings screen evidence

Route: `/design-preview/academy-settings`. Branch: `codex/settings-screen-locked-ui`, based on Home `d20f1a7`. The focused preview has been implemented and checked; no user visual approval is recorded. The later final-portal-integration brief supersedes its preview-only scope. These are preview evidence, not acceptance of the authenticated customer portal. No commit, pull request, merge or deployment is claimed here.

## Source and scope

The actual task attachment `codex-clipboard-939a9c02-2ffc-4e5b-893c-c77d8db55928.png` was opened and inspected. It is saved unchanged as [settings-screen.png](../../reference/approved-ui/settings-screen.png), 1536 × 1024, SHA-256 `B53CC6AAE078701EE7B5B6CE8165C7C99FE646D9D77475601871C51D23F07A7D`.

The supplied Riverside crest is cropped at `(1200, 210, 1270, 297)` to a 70 × 87 raster asset, used only for the matching fictional academy. [settings-assets.json](../../reference/approved-ui/settings-assets.json) records the crop and hashes. The Home Sportozen/sidebar assets are reused. No replacement logo, new generated concept or whole-screen screenshot background is used.

This is the existing frontend preview and adapter, with real HTML fields, text, controls and navigation. Authenticated customer screens, server services, schema, databases, records, provider integrations and working product features are unchanged. Home source/CSS remain unchanged; the new focused shell reuses their navigation DOM/classes and CSS. Existing Players, Calendar and Parent Home retain their implementations. All current edits remain isolated fictional session state; no customer API requests or external effects are authorised.

## Saving and supported behaviour

One **Save Changes** action covers academy name, local profile/contact notes, saved preview defaults and the staged logo. The settings helper validates fields, checks academy/version/fingerprint, and uses a confirmed-persistence adapter operation. A storage failure retains the draft and prior confirmed configuration; it cannot falsely report persistence. Failure/conflict scenarios retain the draft, with explicit retry/review before the existing save action. Existing venue/subscription workflows are separate and are not silently included in that save.

Unsaved values also stay in private module memory, keyed by academy plus confirmed version/fingerprint, so browser Back/Forward can recover the editor without another storage channel or history interception. Accepted discard, confirmed save and explicit reset clear recovery; reset remounts this editor using a non-persisted adapter generation. Reload retains the existing browser unload warning; unsaved recovery does not survive a full document reload or browser closure. The optional discard callback does not change the behavior of existing hook callers.

The full Academy fixture uses owner Alex Morgan rather than the reference's coach identity. `?role=COACH` and `?role=PARENT` are explicitly fictional restricted views with no academy fields or save/deletion/subscription controls. Query roles never authorise customer APIs; their server membership checks remain unchanged. An unknown academy shows unavailable and does not silently select another one. Academy switching is guarded by unsaved-change confirmation and uses per-academy stored profiles.

The logo thumbnail and right-side editor share one staged value and file input. Both use the existing PNG-only, under-200 KB handling. JPG remains unsupported despite the illustrative JPG copy. Aspect ratio is preserved; removal stages an initials fallback until saved. Selection does not upload media, and the 512 × 512 recommendation does not reject other dimensions.

## Deliberate differences from illustrative records

- Fictional `.test` contacts replace the reference's customer-looking email/website. Phone and website start blank; location/about/phone/website are identified as local preview profile notes because customer persistence for them is not implemented. About uses a stated 250-character preview limit and an actual calculated counter.
- Time zone and language reuse existing saved draft keys. The time zone is a preview default; recorded sessions/calendars retain their existing zone and are not rescheduled. Only English is available. Week start, category/date/time formats remain readable disabled fields because configurable persistence is unavailable; age categories and dates of birth are unchanged.
- The venue card displays the existing single academy-scoped venue editor record, not a fabricated second ground. The menu opens that editor/list. Add Venue explains that creating another independent record is unavailable; it does not overwrite the current venue automatically. Venue type is Not recorded.
- The software card uses the recorded fictional monthly software amount and existing capabilities. It does not claim Pro, unlimited players, priority support or a billing connection. Manage Plan is unavailable; training fees remain separate.
- Danger Zone opens an explicitly non-destructive restriction preview. No deletion endpoint, confirmation that deletes records or fee/payment/provider action was added.
- Tabs link existing staff, weekly-session planning, guardian/communication preferences, owner account tools and disconnected WhatsApp setup workflows. They do not imply six new administrative systems or live provider delivery.
- Existing local Noto Sans and supplied low-resolution raster crests are retained. No exact font/vector/licensing claim is made. The shared sidebar uses the saved academy name/location where available and its existing country fallback otherwise; owner Alex Morgan replaces the illustrative coach identity.

## Actual browser evidence and inspected comparison

The existing page was captured under [before](before/) before dispatch changed. Final browser captures are under [after](after/):

- [1536 × 1024](after/settings-1536.png), [1440](after/settings-1440.png), [1024](after/settings-1024.png), [768](after/settings-768.png), [390](after/settings-390.png), [320](after/settings-320.png), with matching full-page captures.
- [Validation](after/settings-validation.png), [unsaved](after/settings-unsaved.png), [confirmed saved](after/settings-saved.png), [staged logo](after/settings-staged-logo.png), [failed save](after/settings-failed-save.png), [conflict](after/settings-conflict.png), [loading](after/settings-loading.png), [mobile unsaved](after/settings-mobile-unsaved.png).
- [Restricted coach](after/settings-restricted-coach.png), [restricted parent](after/settings-restricted-parent.png), [non-destructive deletion dialog](after/settings-deletion-preview.png).
- Preserved [Home](after/regression-coach-today-1536.png), [Players](after/regression-players-1536.png), [Calendar](after/regression-sessions-1536.png) and [Parent Home](after/regression-parent-home-1536.png).

The [native reference/actual comparison](reference-versus-actual-1536.png) and [390/320 mobile comparison](mobile-390-and-320.png) were opened and visually inspected. The desktop source and actual browser are both 1536 × 1024; the comparison does not crop, stretch or resample them. [comparison-provenance.json](comparison-provenance.json) records hashes. At 1536 px, the measured sidebar is 248 px and the columns are 865.4 / 360.6 px; all six widths have document scroll width equal to viewport width. [viewport-metrics.json](after/viewport-metrics.json) records this.

Visual inspection drove fixes to overlapping contact/location icons, shrinking mobile tabs, oversized crests, inherited list margins, field spacing and primary action emphasis. The main profile/contact card positions and wide/narrow column composition now follow the supplied screen. No similarity percentage or pixel-perfect claim is made.

Remaining differences: the locked Home shell retains its existing navigation row spacing and academy-name wrapping; owner identity replaces the illustrative coach. The actual single venue, fictional contacts, read-only unsupported formats, recorded plan metadata and deletion restrictions deliberately differ from the illustrative data. Existing Noto Sans and low-resolution supplied crest crops remain. Read-only-format explanation adds about 20 px before the venue card. The customer portal needs its own actual-data captures after integration.

Two small source hardenings followed these captures: removing inherited venue details/summary padding, and invalidating all recovery keys after an explicit reset generation. The latter passed focused unit verification. Per integration coordination, another isolated build was not run; the integrated artifact must recapture the final venue geometry and run the focused browser checks before final delivery.

## Verification and source status

The complete unit suite passed **85/85**. The ten Settings model cases passed again after reset-generation cache hardening. Relevant full-source ESLint passed, as did focused final-file lint. Strict standalone TypeScript passed earlier; the final isolated production build also passed TypeScript, compiled successfully and generated all routes. The final production artifact used its own `.next-gallery-qa` and `.local/e2e-*.sqlite`; browser QA used port 3002 with matching `BETTER_AUTH_URL`, one worker and Edge. No customer database or unrelated server was changed.

**Eight distinct focused browser cases passed**: six-width geometry/overflow; one save with validation/reload/academy switching; synchronised logo staging/removal/reload; failure/conflict recovery and restricted roles; mobile save/loading; keyboard/dialog/tab/deletion/unsaved guards; four-screen preservation captures; Back/Forward recovery with explicit discard/reset. Seven passed in the final suite and the keyboard case passed in a focused rerun after changing its locator to the actual accessible combobox role. The saved-state hydration defect found during verification was corrected before this passing run.

No tested commit exists yet: these are uncommitted changes on the stated branch. The integration coordinator will consolidate them on `codex/academy-portal-integration`, test the resulting commit and prepare the requested review. The transfer manifest and real-service dependencies are in [SETTINGS_PORTAL_INTEGRATION_AUDIT.md](../../design/SETTINGS_PORTAL_INTEGRATION_AUDIT.md). Tests do not establish visual approval. No customer data reset, deletion, external send, live charge, merge or deployment occurred.
