# Approved UI reference map

Recorded on 14 October 2026 for `codex/locked-ui-fidelity`, based on the newer local frontend at `748d023f756de899c58e2b5226eb39293db6a813`. The user selected the visual direction in these references; the corrected implementation still requires visual review.

## Available source files

The requested `Sportozen_All_UI_References.zip` and the named `Sportozen_UI_Screen_Collection/` directory were not found in the searched Downloads, task attachments or repository. No ZIP was unpacked. Matching named primary panels already exist in `docs/reference/ui-gallery/`, extracted in the previous task from the user-supplied `Sportozen_UI_Gallery.html`. The original board was already saved in `docs/reference/approved-ui/Sportozen_Approved_UI_Reference.png` from the user's supplied image. These four actual images were opened and visually inspected before this correction. Their copies below preserve their bytes.

| Requested source                                                                           | Available original                                               | Canonical saved copy                                                                                          | Screen / use                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Sportozen_UI_Screen_Collection/screens/01-coach-today.png`                                | `docs/reference/ui-gallery/01-coach-today.png`                   | [Coach Today](../reference/approved-ui/screens/01-coach-today.png)                                            | `/design-preview/coach-today`; desktop composition, compact header, navy navigation, dominant football card, narrower schedule/action column and supporting cards. |
| `Sportozen_UI_Screen_Collection/screens/02-player-profile.png`                             | `docs/reference/ui-gallery/02-player-profile.png`                | [Player Profile](../reference/approved-ui/screens/02-player-profile.png)                                      | `/design-preview/player-profile`; retained reference for later work. This checkpoint does not restyle that screen.                                                 |
| `Sportozen_UI_Screen_Collection/screens/03-parent-home.png`                                | `docs/reference/ui-gallery/03-parent-home.png`                   | [Parent Home](../reference/approved-ui/screens/03-parent-home.png)                                            | `/design-preview/parent-home`; compact academy identity, greeting/child context, focus, approved update, next session, useful actions and bottom navigation.       |
| `Sportozen_UI_Screen_Collection/original_boards/01-approved-coach-player-parent-board.png` | `docs/reference/approved-ui/Sportozen_Approved_UI_Reference.png` | [Original approved board](../reference/approved-ui/original_boards/01-approved-coach-player-parent-board.png) | Composition/provenance cross-check. Compare relevant screen panels rather than the whole board.                                                                    |

The panel filenames and visual content match the selected references. Their provenance is the accessible gallery/board above, rather than a verified copy from the missing ZIP. If a later ZIP contains different pixels, inspect it and ask the user which reference supersedes this lock before changing the interface.

## Dimensions and checksums

| Canonical copy                                              | Pixels      | SHA-256                                                            |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| `screens/01-coach-today.png`                                | 1095 × 561  | `C0C71532E82D7C253A83A1EE3E71B9CFFDFCCE7AF36131A497F277DA34229B9F` |
| `screens/02-player-profile.png`                             | 1103 × 442  | `56F2D6529F56516EDAD5A7ADD5773747893ABBAC8032AE1D6B154CF46AD4A211` |
| `screens/03-parent-home.png`                                | 265 × 557   | `D6F81478DA49CC5A7FC7C9182CDF53F01F913C40E66DC9B8A112B223F26AC871` |
| `original_boards/01-approved-coach-player-parent-board.png` | 1536 × 1024 | `77B84EE1AE4DD046EDA758567F2BBAFC43767D4977384C223E1283FA4F0CA250` |

The hashes above were computed from both available originals and canonical copies and are identical. The saved original gallery HTML has SHA-256 `5DC24C3F97BE0AA38BB26FFCB3A572264EAA4EE64C69152B050E9E57214B0358`; see `docs/reference/ui-gallery/inventory.json` for its previous extraction inventory.

## Comparison rules

Use the Coach Today panel's actual screen area without inventing another dashboard treatment. For Parent Home, crop away the phone bezel, operating-system status/notch area and exterior presentation backdrop before comparison. Browser captures must show real rendered components, not screenshots used as the screen background. The board's device frames, handwritten presentation captions and exterior background are not part of the product.

The current preview uses the local `Preview Noto` family backed by `public/fonts/NotoSans-Regular.ttf` and `NotoSans-Bold.ttf`. The supplied raster artwork does not identify an exact font or provide a font licence/vector logo. Record Noto Sans as a substitution, and verify browser font loading; do not claim an exact font match. Preserve the existing editable academy identity and scoped academy accent. Existing approved football crops may be used as illustrations; their resolution/crop limitations must be recorded with the comparison.

The selected panels define proportions, visual hierarchy, typography emphasis, spacing, card structure, image treatment and button prominence. Their example names, numbers, dates and coach observations do not establish actual customer records. Consistent fixtures or authorised records may change text, counts and dates without changing that hierarchy. Do not add fabricated scores, provider states, verification marks, signatures or QR codes.

Files labelled `early` and other alternate/supporting panels in `ui-gallery/` remain historical context. They cannot override these selected anchors or be blended into a new style. A standalone Drills Library is deferred from primary navigation under the current product instructions, even though the older Coach Today artwork includes a library row; existing activity records and links from plans/sessions remain accessible.

## Current correction checkpoint

Implementation scope is Coach Today and Parent Home only, with their responsive adaptations. Other screens stay accessible and visually unchanged except for unavoidable, tested shared dependencies. The exact before/after captures, comparisons, final tested commit and check results belong in the correction evidence record. Do not interpret this reference map or successful tests as user approval of the implementation. See [UI_LOCK.md](UI_LOCK.md) for subsequent-task rules.
