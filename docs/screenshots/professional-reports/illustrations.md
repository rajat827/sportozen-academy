# Original football activity illustrations

Created 16 October 2026 for the professional report UI, after opening the actual user-supplied `Sportozen_Reports_Illustrated_UI_Reference.png` from Downloads. Reference SHA-256: `A9D6DD3EEC7D2ABCEB0150D6899570C8A8FB9E3DF77254FC660558D095C4F0C2`.

The reference guides the shared cartoon treatment: green pitch, pale blue sky, trees, blue football kit, orange cones and a ball. These are new, original vector drawings made from editable paths/shapes. No pixels were cropped, traced or embedded from the reference. No real child photograph, academy crest, stock illustration, external font or remote resource is included.

## Files and usage

All SVGs use a **320x200 viewBox (8:5)**. Matching opaque PNG posters are **960x600**, rendered at 3x resolution for reliable local React-PDF image embedding. Browser assets are served from `/report-activities/`. Use the SVG in the web UI and the matching PNG for the PDF; preserve the 8:5 aspect ratio and avoid cropping a player or ball. Corners can inherit the existing card's clipping.

| Activity | Editable vector | PDF poster | SVG / PNG bytes |
| --- | --- | --- | --- |
| `movement-warm-up` | [SVG](../../../public/report-activities/movement-warm-up.svg) | [PNG](../../../public/report-activities/movement-warm-up.png) | 4,821 / 55,159 |
| `close-control` | [SVG](../../../public/report-activities/close-control.svg) | [PNG](../../../public/report-activities/close-control.png) | 4,923 / 55,984 |
| `passing-pairs` | [SVG](../../../public/report-activities/passing-pairs.svg) | [PNG](../../../public/report-activities/passing-pairs.png) | 6,511 / 60,226 |
| `small-sided-game` | [SVG](../../../public/report-activities/small-sided-game.svg) | [PNG](../../../public/report-activities/small-sided-game.png) | 10,221 / 75,895 |
| `generic-football` | [SVG](../../../public/report-activities/generic-football.svg) | [PNG](../../../public/report-activities/generic-football.png) | 6,838 / 63,685 |

`generic-football` is an illustration fallback for a saved activity without a specific matching illustration. It is not a replacement activity or inferred coaching fact. Activity titles and descriptions must remain editable, accessible text derived from the saved report; the files contain no visible captions or scores. Each SVG has a generic accessible title and description. All artwork is static, so there is no animation or reduced-motion variant to manage.

These drawings are **generic activity illustrations, not evidence of a particular child, session, attendance, assessment or achievement**. They do not establish a live service, real coach review or AI analysis. Use the existing report's actual immutable text and evidence independently.

## Rendering and inspection

Rendered from the SVG sources with the already-installed **sharp 0.35.5 / libvips 8.18.7 / librsvg 2.63.2**, resolved through Next's existing dependency. No package was installed or changed. Rendering uses SVG density 216, resizes to 960x600 and writes PNG with compression level 9:

```js
const { createRequire } = require("node:module");
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
await sharp(svgPath, { density: 216 })
  .resize(960, 600)
  .png({ compressionLevel: 9 })
  .toFile(pngPath);
```

All five actual PNGs were opened and visually inspected. An initial open-path fill artifact in the limbs was corrected in the SVG sources, all posters were rerendered, and all five corrected PNGs were opened again. The inspected final artwork has clean limb joins, distinguishable activity poses, readable balls/cones and unclipped foreground figures. Structural checks confirm the intended viewBox and no scripts, embedded images, foreign objects, animation or external links. This asset inspection does not grant user approval of the integrated report layout.

## Provenance and rights

**Original project artwork**, authored for Sportozen as code-native SVG in this implementation. The assets are supplied for the project's use, editing and commercial distribution; no third-party image attribution or additional third-party asset licence is introduced. This statement applies only to the new drawings and their PNG renders. It does not relicense the supplied reference, academy branding or other repository material, and it does not assign a new project-wide licence.

## Final file checksums

| File | SHA-256 |
| --- | --- |
| `movement-warm-up.svg` | `acd285dbe781c2150059decefb772543b392951967a8e829317f2bfc20669d2a` |
| `movement-warm-up.png` | `49737d3055d9ede1ee33044a62ad5697a2b4f9f0ba46eedca02d098d4a3a0a8b` |
| `close-control.svg` | `e14500f8ab6b7c9638a5d8d8e074b92f9a5c54c2c2e4215c4b2d330aa1c36b38` |
| `close-control.png` | `a57319c8bcd95a8508746d84c82d79c12182dc36eca0065faeddcf18c9e0ad8e` |
| `passing-pairs.svg` | `0a5d9699de0c588357285bf82cddce351acea795c5f68a533f066293db67a308` |
| `passing-pairs.png` | `242b22eb205c54bf1c202a59f396187ff8b547a3c59f7f417b7958e823b01689` |
| `small-sided-game.svg` | `568d311f1651613bbc51a3162108115ee6396b0bb266042f86455e9879c3d08c` |
| `small-sided-game.png` | `10338db33fb5d91fad89dafd9d6b93988975625c68a576f57a26ed30318a0831` |
| `generic-football.svg` | `a9d151d6c0ba9c580e751c005a8e91be4436eeb75b9a2ef3d6b1ab47b670dabe` |
| `generic-football.png` | `269c51aa01f2f08a7caeaf507da1fa84899811c8d894eef01525af703aca8472` |
