# Concept B design system

Deep navy `#09283e` anchors the sidebar. Primary action green is `#008b68`, with darker hover `#006d51`. Workspace is `#f5f8fa`; cards are white with soft `#e4ebef` borders. Text is `#142b3d`, secondary text `#687b89`. Blue `#227cb8` denotes calculated information; purple `#7351b5` denotes AI examples; amber `#996014` denotes pending or unclear records; red `#b13c3c` denotes absence or rejection warnings.

Tokens live in `src/styles/globals.css`, including Tailwind theme mappings. Arial/Helvetica system fonts avoid network font dependencies. Desktop titles are 28px, section titles 17px, content 13px; compact table and metadata text is smaller. Spacing follows 4–8px increments; cards use 12px radii, controls 7px and a subtle navy shadow. Chart grid is faint, with blue line and translucent fill.

Evidence badges: Raw Record grey, Coach Observation green, Calculated Metric blue, AI Estimate purple, Missing / Unclear amber. States are textual, never colour alone. AI suggestions explicitly say “AI suggestion — coach approval required”.

Shared components: Button, Badge, EvidenceBadge, Card, SectionTitle, Avatar, PageTitle, Sheet and Empty. Sheets use Radix modal focus trapping, labelled titles, descriptions, Escape and close controls. Reorder actions have accessible names and disabled boundary buttons. Skip navigation and visible focus support keyboards. Animation respects reduced motion.

Breakpoints: wide desktop 1600+, laptop 1280, condensed sidebar 1024, drawer/bottom navigation 768, mobile layout 540, narrow adjustments 350. Directory tables become player cards on phones. Fee ledgers use controlled horizontal scrolling. Parent content has a focused reading width and bottom navigation. Training screens stack panels and retain prominent timer/observation actions on phones.

Reference: the supplied Concept B build-plan image is preserved in `docs/reference/concept-b-build-plan.png`. It establishes visual direction rather than pixel-exact individual screen specifications. Screenshots provide the reviewable implementation.
