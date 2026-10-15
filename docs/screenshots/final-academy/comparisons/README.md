# Seven-screen reference comparison

These are analytical comparisons of the supplied approved references and actual authenticated browser captures. Both images are preserved at native 1536 px width; any longer browser image remains visible. Open the PNG at full size to read the application text. The right column records inspected differences.

**Awaiting user visual approval.** No similarity score, passing test, or image inspection establishes approval.

The implementation captures use persisted synthetic Bharat Football Academy records. Reference example names, totals, dates, portraits, and provider/payment states must not be fabricated to match the design.

Typography uses the existing Noto Sans substitution. The raster references do not identify an exact font source, so an exact typeface match is not claimed. The other widths are responsive adaptations; no matching per-screen mobile references were supplied for these seven desktop boards.

| Screen | Native comparison | Approved reference | Actual browser |
| --- | --- | --- | --- |
| Home | [home-1536-comparison.png](home-1536-comparison.png) | [home-screen.png](../../../reference/approved-ui/home-screen.png) | [home-1536.png](../bharat/home-1536.png) |
| Players | [players-1536-comparison.png](players-1536-comparison.png) | [players-screen.png](../../../reference/approved-ui/players-screen.png) | [players-1536.png](../bharat/players-1536.png) |
| Calendar | [calendar-1536-comparison.png](calendar-1536-comparison.png) | [calendar-screen.png](../../../reference/approved-ui/calendar-screen.png) | [calendar-1536.png](../bharat/calendar-1536.png) |
| Training | [training-1536-comparison.png](training-1536-comparison.png) | [training-screen.png](../../../reference/approved-ui/training-screen.png) | [training-1536.png](../bharat/training-1536.png) |
| Reports | [reports-1536-comparison.png](reports-1536-comparison.png) | [reports-screen.png](../../../reference/approved-ui/reports-screen.png) | [reports-1536.png](../bharat/reports-1536.png) |
| Fees | [fees-1536-comparison.png](fees-1536-comparison.png) | [fees-screen.png](../../../reference/approved-ui/fees-screen.png) | [fees-1536.png](../bharat/fees-1536.png) |
| Settings | [settings-1536-comparison.png](settings-1536-comparison.png) | [settings-screen.png](../../../reference/approved-ui/settings-screen.png) | [settings-1536.png](../bharat/settings-1536.png) |

## Home

- **Data/context:** Actual: synthetic Bharat owner on 15 October 2026, with 60 players and six batches. Reference: Coach Rahul at Riverside on 20 October with example totals.
- **Data/context:** No session is scheduled on the capture day. The hero truthfully shows the next confirmed 20 October session. October has no reports; 120 approved historical reports remain separate.
- **Visual:** The navy sidebar, football hero, adjacent schedule, four metrics and supporting card grid follow the reference composition. The hero preserves matching football imagery.
- **Visual:** Actual support text and icons are smaller and lighter. Lower cards occupy more vertical space; the complete actual page is 1114 px high versus the 1024 px reference.
- **Visual:** The academy uses a shield fallback and the development card uses a focus icon because no academy crest or child portrait was supplied. The reference crest, portrait and closing quote are absent.
- **Limit:** The empty Today schedule and October chart differ in density from the populated reference. They are actual data states, not fabricated example activity.

## Players

- **Data/context:** Actual: 60 synthetic players, six batches/coaches and no trial enrolments. The selected player is Aadi Fictional U8, with recorded Dribbling focus and August/September history.
- **Data/context:** Individual birth dates, positions and portraits were not supplied. The interface uses missing-value labels and avatar fallbacks rather than assigning invented values.
- **Visual:** The directory, four summary cards and selected-player panel retain the reference arrangement. The toolbar includes a local player search and omits the reference More Filters button.
- **Visual:** Actual table rows and the selected-player content are taller; ten rows plus the added Trial enrolment section make the full page 1304 px high versus 1024 px.
- **Visual:** The large portrait, row photos and selected-player star in the reference are replaced by honest empty-avatar treatment. Support type and table labels are smaller than the reference.
- **Limit:** The added real Trial enrolment controls are part of the later functional scope. Missing portraits and player attributes limit a like-for-like visual comparison.

## Calendar

- **Data/context:** The actual week contains six confirmed, one-hour training sessions on 20 October, one for each real batch. It does not invent the reference matches, trial, academy closure or additional dates.
- **Data/context:** The selected Under-8 session uses its actual coach, ten-player roster, Excelsior location, shared focus and preparation.
- **Visual:** The week grid, filter row and right session panel follow the reference structure. Actual view controls sit at the right of the date navigation rather than immediately beside it.
- **Visual:** The actual grid has hourly labels and runs to 9 PM. Consecutive one-hour events are short cards with clipped secondary text; the reference uses larger event blocks and two-hour labels.
- **Visual:** Session details use smaller headings and support text, with the primary action and tabs lower in the panel. The actual selected day header lacks the reference pale-green date highlight.
- **Limit:** Only training events exist in the fixture. Other event colours and the denser reference schedule cannot be compared from this state.

## Training

- **Data/context:** The actual selection is the confirmed Under-8 session: ten players, four recorded drills and 60 minutes. The reference shows a 16-player U12 session and 90-minute example plan.
- **Data/context:** The actual drill wording, preparation and coaching points come from the shared batch plan. Optional player personalisation remains a separate action.
- **Visual:** The session list, centre plan and right resources/actions retain the reference three-column desktop structure. Smaller support type and longer recorded wording expand the desktop page to 1215 px.
- **Visual:** Drill thumbnails are football-pitch diagrams rather than the reference player photographs. Roster initials replace portraits because child photographs were not supplied.
- **Visual:** The corrected 768 px view stacks the bounded session list above a full-width plan. At 320/390 px the existing filters wrap onto additional rows and retain visible option identity.
- **Limit:** Photographic drill thumbnails are not matched. Mobile native selects can abbreviate long option text; complete accessible labels and native option lists remain available.

## Reports

- **Data/context:** Actual September view: 60 authorised players, 60 selected-period reports and 120 approved reports across August/September. Reference numbers and October example states are not copied.
- **Data/context:** The selected approved report preserves recorded attendance, evidence, next steps and long review comments. Unrecorded engagement percentages or progress scores are not invented.
- **Visual:** The corrected table displays eight rows per page across eight pages. Top tabs, four metrics and the selected-report panel retain the reference arrangement.
- **Visual:** The actual full page is 1236 px high versus the 1024 px reference. Preview excerpts are explicitly labelled; complete long wording remains in Open full report preview. Recorded evidence still makes the side panel taller.
- **Visual:** At 768 px the preview follows the paginated table and narrative cards stack at full width. The corrected page is 2285 px high instead of the earlier 9635 px.
- **Visual:** Reference Progress bars and engagement percentages are absent because they are not recorded. Actual date labels include reporting-period/timezone text rather than friendly example dates.
- **Limit:** Compact preview and full report remain distinct. Portraits, progress graphics, typeface, support-text sizing and some vertical spacing differ from the supplied raster design.

## Fees

- **Data/context:** The Bharat fixture has no issued training invoices or verified payments. Actual totals are zero and the collection rate is unrecorded; no bill or paid state is inferred from enrolment.
- **Data/context:** The reference shows a populated invoice table and selected unpaid account. Its amounts, parent phone and payment status are example content, not seeded finance records.
- **Visual:** The actual title, tabs, four summary cards and filter/table surface preserve the main hierarchy, but an honest empty state spans the table area and no selected fee account panel appears.
- **Visual:** The primary action is Create Invoice, following the implemented manual finance workflow. The reference Collect Payment action and phone/WhatsApp shortcuts are not represented as connected services.
- **Visual:** Summary values remain on one line. Table/support typography is smaller than the reference. The empty table has substantially more blank space than the populated design.
- **Limit:** The Bharat capture cannot establish populated-account fidelity. A separately linked actual Fees capture from another isolated QA academy shows guardian/account detail, invoice rows, partial balance, verified reference and receipt; it is never substituted for Bharat.

## Settings

- **Data/context:** Actual academy name, supplied location, six age groups and synthetic email replace Riverside examples. About, phone and website remain empty because values were not supplied.
- **Data/context:** The actual LOCAL FOUNDATION subscription is active. Unavailable subscription billing and academy deletion are explicitly disabled rather than presented as working live services.
- **Visual:** The profile/contact/settings/venues stack and logo/plan/danger side column closely follow the reference proportions. The full actual page is 1047 px high versus 1024 px.
- **Visual:** BF fallback initials replace the reference crest. The actual plan lists four supported capabilities rather than the six reference marketing items.
- **Visual:** Support text is smaller. Additional regional settings are collapsed behind an explicit disclosure; venue content uses the single supplied training location.
- **Limit:** Logo upload treatment cannot be compared with a custom academy crest until one is supplied. Empty optional fields reflect the actual saved academy record.

## Populated Fees supplement

[Actual populated Fees capture](../regression/academy-portal/fees-1536.png) uses a separate isolated QA academy with persisted finance records. It supplements the honest empty Bharat Fees state; it is not substituted into the Bharat comparison. Its hash and dimensions are recorded in `comparisons.json`.


## Reproduction

Run the comparison script after completing hash-bound image inspection notes:

```text
python scripts/qa-final-academy-comparisons.py
```

`review-notes.json` binds observations to the reference and actual input hashes. `comparisons.json` records dimensions, processing, provenance, and hashes. Browser verification and the other responsive widths are separate evidence; these desktop boards do not establish mobile fidelity.

## Responsive evidence

The manifest indexes 39 actual capture files; 39 have hash-bound image inspection notes. File presence alone is not a test pass. See `responsive-review.json` for findings and `comparisons.json` for the browser verification file and hash.

Capture provenance is explicitly mixed on the same unchanged product build: 21 desktop/tablet images use the read-only neutral-scroll/focus capture attempt; 18 mobile/Parent images remain from the successful full Bharat verification. The redundant capture-only attempt stopped because its readiness predicate incorrectly waited for a lazy logo inside the CSS-hidden mobile sidebar. The helper predicate was corrected and type/lint checked, with no further browser retry. Its failed attempt remains recorded; it does not replace or invalidate the separate successful functional/privacy verification. See `../bharat/screenshot-manifest.json` and `../bharat/capture-verification.json` for exact per-image provenance and history.
