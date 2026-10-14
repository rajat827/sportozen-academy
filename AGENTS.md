# Sportozen engineering principles

Work on feature branches. Use strict TypeScript and focused feature components. Run lint, typecheck, unit tests, browser smoke tests and build before review.

Academy-owned entities include academyId; sporting entities include sportId. Sport vocabulary belongs in configuration. UI calls feature hooks, hooks call repositories, repositories call the storage adapter. Never access browser storage in components.

Concept B: deep navy navigation, green actions, white workspace, restrained cards, table-first operations and mobile parent navigation. Keep semantic labels, keyboard controls, visible focus and usable touch targets.

Legacy /owner, /coach and /parent routes are explicitly fictional browser demonstrations. Authenticated /workspace routes use server sessions, academy memberships and server persistence. Never use demo role selection or a client academy ID as authorisation. Every direct read, write and PDF export must check current membership and player scope. Platform administration grants customer metadata access only; child access requires an academy-authorised, expiring and audited support grant.

Legacy fictional demonstrations never send externally; payment records never collect money. Authenticated WhatsApp delivery requires server enable flags, independently approved current content, verified guardian consent and actual provider-approved templates. Development/CI use transport doubles, never real sends. Keep approval, in-app publication and per-recipient external delivery separate; provider acceptance is not delivery. AI suggestions require coach approval and AI Video Analysis is Coming soon. Missing evidence is never zero. No rankings, comparisons between children, predictive or medical claims. Nutrition is optional approved general guidance. New customers start empty; fixtures require an explicit fictional-demo choice.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Approved UI direction lock

Read `docs/design/UI_LOCK.md` and `docs/design/UI_REFERENCE_MAP.md` before visual, feature or backend work that touches the frontend. The named Coach Today, Player Profile and Parent Home references in `docs/reference/approved-ui/screens/`, together with `original_boards/01-approved-coach-player-parent-board.png`, are the selected visual source of truth. Older exploratory mockups and broad “Concept B” wording do not override them.

Backend and feature tasks must not redesign the interface. Do not change navigation, typography, spacing, card structure, icon/button hierarchy or academy branding without explicit user approval. New screens reuse the approved components and visual rules. The current instruction defers a standalone Drills Library from primary navigation; preserve existing activity records and their session/plan links.

Shared visual-component changes require regression screenshots of Coach Today and Parent Home and affected views. Real data may change; the layout must not drift because fixtures changed. Fixture/role/scenario/reset/gallery controls belong outside normal product composition in a separate gallery or accessible developer drawer closed by default; legitimate authorised selectors and a compact fictional-preview notice remain visible in context. Preserve keyboard focus, drawer accessibility, readable text and touch targets.

Passing tests never establishes user approval. Distinguish “Implementation ready for visual review” from “User-approved design.” The current correction checkpoint is only Coach Today and Parent Home with responsive adaptations; preserve other screens until those two are reviewed. Do not broaden into another redesign, Figma reorganisation, backend changes, a main merge or deployment. Record actual browser evidence and remaining differences, then stop for the user's visual approval.
