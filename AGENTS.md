# Sportozen engineering principles

Work on feature branches. Use strict TypeScript and focused feature components. Run lint, typecheck, unit tests, browser smoke tests and build before review.

Academy-owned entities include academyId; sporting entities include sportId. Sport vocabulary belongs in configuration. UI calls feature hooks, hooks call repositories, repositories call the storage adapter. Never access browser storage in components.

Concept B: deep navy navigation, green actions, white workspace, restrained cards, table-first operations and mobile parent navigation. Keep semantic labels, keyboard controls, visible focus and usable touch targets.

All records are fictional demo data. Messages never send; payment records never collect money. AI suggestions require coach approval. Missing evidence is never zero. Parents only receive their linked player's reviewed, public records. Role switching is demonstration navigation, not authentication. No predictive or medical claims.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
