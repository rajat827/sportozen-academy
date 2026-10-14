# Preview design system

Source scope: `.design-preview` in `src/features/design-preview/preview.css`; existing customer styles and functional route components are unchanged.

| Foundation | Value / use |
| --- | --- |
| Navigation | Deep navy `#09283e`, readable white/soft-blue labels |
| Main ink / secondary | `#142b3d` / `#526775`; semantic states also use text |
| Primary accent | Riverside green `#008463`; Harbour blue `#126aa2`; white button labels |
| Surfaces / border | White cards, `#f5f8fa` canvas, `#dce5e9` border |
| Typeface | Locally served Noto Sans Regular/Bold, same font family available in Figma and used by the existing PDF pipeline |
| Type ramp | 32/28/25px responsive main headings; 21px sections; 16px subheadings; 15/16px body/input; 12/13px metadata |
| Spacing | 4/8/12/16/20/24/28/40px; 24px card/layout spacing; 12px card radius; 8px control radius |
| Actions / focus | Minimum 44px buttons, visible 3px focus ring; Radix focus-trapped drawer, Escape and opener focus restoration |
| Responsive | 1440/390 primary; 1280/1024 condensed desktop, 768 mobile navigation, 320 narrow stacking |
| Motion | No unnecessary animation; reduced-motion override |

Reused source primitives: Button, Card and Badge from `src/components/ui/primitives.tsx`; Radix Dialog for prototype drawers; existing ReportPreview and ReportDownload for approved fictional reports and local PDFs. Feature-specific layers: Head, Field, Check, Go, Pitch, Context, PreviewDrawer, agenda/player rows and isolated role shell.

The diagram describes an actual receiving-task setup, not performance data. The existing fictional receiving-practice animation has captions and explicitly says it is not player evidence. No fake photos, verification badges, testimonials or academy logos were introduced. Fictional academy monograms are labelled fixtures.

Figma component inventory after access is available: Button variants (primary/secondary/disabled), Field (default/error/read-only), Badge, Card, role navigation, Player row, Agenda row, message preview, payment summary and report families. Foundation variables need semantic aliases, explicit scopes and WEB syntax tied to the preview CSS variables; text styles must use Noto Sans, and layouts must use Auto Layout. These are **pending**, not components claimed to exist in the empty Figma file.
