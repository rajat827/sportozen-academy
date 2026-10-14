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
