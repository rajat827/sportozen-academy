# Professional Reports visual review

The actual authenticated Reports UI and PDF exports have been captured, compared with the supplied reference and visually inspected. **This is implementation evidence for user review, not user design approval.** Lint, typecheck, production build and 258 unit tests passed. The initial 59-case browser run recorded 57 passes and 2 failures; after the two diagnosed fixes, focused rerun 92657 passed both cases. Independent verifier 36042 passed all 120 actual PDF exports / 122 pages with no failures. The recorded browser coverage is 57 initial passes plus 2 passing focused reruns, rather than a claim of one green 59-case batch.

## Actual reference, browser and PDF comparisons

The actual [approved reference](approved-reference.png) is 1448x1086. The only cropped inputs are its management panel `(0,0,831,1086)` and report panel `(842,18,1440,1086)`. Actual images retain their full content and height. Equal-width panels use proportional scaling, never stretching or cropping an actual screenshot to make it resemble the reference.

| Comparison | Inputs and inspected result |
| --- | --- |
| [Management at 1536px](comparisons/management-1536.png) | Approved management panel / [actual 1536px browser](after/reports-1536.png) / observed differences. |
| [Management at 1440px](comparisons/management-1440.png) | Approved management panel / [actual 1440px browser](after/reports-1440.png) / observed differences. |
| [Approved report / actual Aadi August PDF](comparisons/report-aadi-august.png) | Reference report panel / [complete actual page](after/U8-01-2026-08-1.png) / remaining differences. |
| [Aadi August: three original pages / one actual page](comparisons/aadi-pagination-before-after.png) | All three [original PDF](before/aadi-august-original.pdf) pages remain visible beside the actual one-page export. |
| [Parent responsive context](comparisons/parent-mobile-context.png) | Actual [390px](after/parent-report-390.png) / [320px](after/parent-report-320.png) linked-parent reports. The supplied reference has no mobile panel, so this is labelled context/usability rather than a claimed mobile design match. |

All five generated boards were opened and inspected. After final professional rerun 10824, the browser PNG byte hashes and all seven rerendered PDF-page pixels were identical to the inspected versions. Changed PDF export byte hashes were reverified and the comparison bindings refreshed. [Inspection notes](comparisons/review-notes.json) are bound to input SHA-256 hashes; the [comparison manifest](comparisons/manifest.json) records input paths, reference crops, dimensions, proportional scale and output hashes. The original images remain linked for reading small text and assessing the fixed navigation in its native viewport. The viewport-fixed bottom navigation and visible captured report outline were not removed from Parent screenshots.

## Actual endpoint exports and page inspection

These are actual authenticated exports from the professional-report build, not the earlier offline helper samples. Poppler rendered them at 110dpi; every page listed below was opened and inspected.

| Actual export | Page count | Rendered pages and observed result |
| --- | --- | --- |
| [Aadi August](after/U8-01-2026-08.pdf) |1| [Page 1](after/U8-01-2026-08-1.png): all four full illustrations, attendance, dated attempts, evaluation and next-step/note cards fit without overlap or footer collision. |
| [Aadi September](after/U8-01-2026-09.pdf) |3| [Page 1](after/U8-01-2026-09-1.png), [page 2](after/U8-01-2026-09-2.png), [page 3](after/U8-01-2026-09-3.png): the long 30-paragraph note continues normally, through Review note 30, without truncation or footer collision. |
| [Limited-evidence August](after/U8-05-2026-08.pdf) |1| [Page 1](after/U8-05-2026-08-1.png): the one reviewed attempt is identified separately; insufficient evidence is stated without claiming a comparable trend. |
| [Limited-evidence September](after/U8-05-2026-09.pdf) |1| [Page 1](after/U8-05-2026-09-1.png): actual limited evidence and unconfirmed review date remain honest. |
| [Separate academy](after/another-academy.pdf) |1| [Page 1](after/another-academy-1.png): actual Synthetic Portal Academy / PortalCoach /19 October 2026 review date. No Bharat identity, crest or player facts are carried into this export. |

The separate-academy PDF is a byte-identical copy of the actual regression export at `regression/academy-portal/approved-monthly-report.pdf`, made only after opening its rendered page and confirming its own branding. The [visual inspection manifest](visual-inspection.json) records the five PDF hashes, all seven rendered pages, source provenance and observed checks. No PDF clipping, broken artwork, overlapping captions or footer collisions were found in these inspected examples. One page is confirmed for the normal August case; long notes are allowed to continue across pages.

The old three-page printout contained raw source/reference cards. The new readable report is a structured presentation with activity cards, attendance and recorded observations; this comparison does not assert verbatim old/new PDF text parity. The original approved snapshot hashes are preserved independently, and staff evidence remains separate from the readable parent report.

## Recorded QA scope

Final command outcomes, source-preservation checks and the reviewed change scope are recorded in the [QA report](QA.md), [machine-readable checks](checks.json) and [changed-files ledger](changed-files.md).

- [Actual endpoint/browser verification](verification.json): PASS for 120 original approved reports across 60 original players; immutable snapshot hashes preserved; captured screen hashes recorded; browser page-error and external-request lists empty. This is the named professional Reports case, not a claim that the full regression suite has completed.
- Visual inspection: five actual PDF exports / seven rendered pages, original three-page baseline, supplied reference,1536/1440 desktop captures,390/320 Parent captures and all five comparison boards opened.
- Artwork: [five original SVG/PNG scenes](illustrations.md), static and visually inspected. They are demonstrations, not recordings or assessment evidence of this child.
- Source gates: production build, lint and typecheck PASS; 258/258 unit tests PASS. Latest named professional Reports run 10824 passed 1/1 in 3.3 minutes, including all 120 actual exports and the captured browser contexts.
- Regression history: initial full run 57 passed/2 failed out of 59 in 21.5 minutes. One failure was trace-output collision in the harness; the other exposed legacy non-football data being projected before its sport filter. After isolated trace output and the early sport filter plus preserved-legacy-record unit regression, focused rerun 92657 passed 2/2 in 4.3 minutes. All 59 distinct cases are verified across those runs.
- Independent PDF verifier 36042: PASS 120 exports / 122 pages, failures empty. These automated content/flow/bounds checks are separate from the seven rendered pages opened for visual inspection.
- User visual approval: not recorded. No fidelity percentage or design approval is inferred from tests or these images.

Initial read-only source verification found 60 manifest players and 120 original approved report IDs/snapshot hashes within 180 current reports, including 60 additional October 2026 drafts. The workflow preserves extra records rather than resetting the database to the old fixture total. Early offline helper outputs were kept separate and were replaced in `after/` by the actual endpoint exports before these comparisons were generated.

## Remaining differences and limitations

The detailed per-image notes are on each board. The main differences visible in the actual inputs are:

- **Typography and composition:** Noto Sans substitutes for the unidentified reference font. Existing desktop navigation and directory widths are retained, with a larger share of the workspace used by the report. Native month controls, More report tools and explicit private-PDF/parent actions differ from the reference's compact icon treatment. Saved-source and attendance explanations add some vertical space.
- **Saved identity and media:** actual fixtures use Aadi Fictional U8 and Synthetic U8 Coach, not Rahul Mehta. Missing saved crest/photo data uses text and initials; a decorative crest or child portrait is not invented. The signed-in Owner context and existing More / AI Video Analysis Coming soon navigation remain intact.
- **Illustrations:** original static blue-kit football scenes use different poses and flatter shapes than the reference art. All figures and balls remain visible; artwork introduces no child-performance fact.
- **Review information:** the actual next-review date is 30 September 2026 for Aadi. It is not substituted for the reference's historical Reviewed on 30 August label, and the example enjoyment quote is not invented. Chart dates explicitly identify reviewed observations rather than unconfirmed session dates.
- **Printed page:** the export is true A4 portrait, while the reference is a presentation panel with different proportions. The PDF uses a compact attendance strip, contained activity images, full-width recorded-attempt chart and restrained text footer. Decorative grass/swoosh/football footer art, extra icons and the separate Steady progress badge are absent. The comparison preserves these differences instead of stretching the actual page.
- **Mobile comparison:** no corresponding approved mobile panel was supplied. The Parent board demonstrates real responsive context at 390/320px; it cannot establish reference fidelity for a nonexistent panel.

No merge, deployment, real external message or live payment is established by this folder. Visual acceptance remains with the user.

## Reproduce the analytical boards

Use [create-professional-report-comparisons.py](../../../scripts/create-professional-report-comparisons.py) with the existing Pillow/pypdf runtime. This tool captures no browser, changes no product data and creates no application art. For new inputs, explicitly update and reinspect their hashes; do not mark them inspected automatically.

```powershell
python scripts/create-professional-report-comparisons.py --parent-390 parent-report-390.png --parent-320 parent-report-320.png
```

For a new inspection worksheet, use `--prepare-review` only when no worksheet exists. Existing notes are retained rather than silently replaced. Replacing an actual capture or PDF invalidates its inspection binding.
