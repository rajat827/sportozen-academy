# Architecture

Customer flow: workspace UI → feature hook → authenticated server application service → academy-scoped repository interface → SQLite persistence. Better Auth verifies the session; application services independently verify current membership, sport scope, assigned players and guardian links. API responses and PDF exports are private/no-store. Platform administration and authorised support review are separate roles. See MULTI_ACADEMY_FOUNDATION.md and SECURITY_AND_DEPLOYMENT.md.

## Isolated legacy demonstration architecture

Next App Router uses owner, coach and parent route groups with role-specific catch-all pages. A lightweight Next.js proxy validates route shapes before streaming so unsupported paths return HTTP 404; it does not perform authentication. The server route dispatcher composes focused feature screens. Business features stay outside route files. The app shell supplies navigation, role switching, shared provider and responsive chrome.

`src/domain/entities` defines tenant records, sporting records, people, plans, sessions, attendance, evidence, reports, financial records and drafts. Academy-owned records carry academyId; sporting records also carry sportId. Shared entities avoid football-only field names. Football positions, skills, stages and report categories live in `src/config/sports/football.ts`. Other sports need their own configuration and fixtures before they become available.

State flow: feature component → `useAcademy` → `AcademyRepository` → versioned `StorageAdapter`. Only the adapter accesses localStorage. The provider loads client records after hydration and commits mutations through the repository before changing UI state. Storage failures report a visible status; corrupted storage restores seeded demo records. A backend adapter can replace the demo implementation, but must add authenticated tenant scope, permission checks, server validation, concurrency control and audit history.

`parentRecords` projects guardian-linked players, their plans, reviewed evidence, approved reports, public observations and explicitly marked fictional message fixtures (new coach drafts remain internal). Current parent Neha is fixed to guardian g1. This prevents accidental UI disclosure; the browser still contains all fictional data and is not a production security boundary.

Data is coherent through stable player/session/goal IDs. Mutations use immutable replacement. Session drafts create unmarked attendance records. Coach observations generate reviewable evidence. Approval is manual. Communication history uses actual timestamps; seeded dates remain fixed for repeatable fixtures.

Charts are dynamically loaded. Table filtering is local and TanStack handles column/row rendering. React Hook Form/Zod validate academy/player forms; other local forms use explicit validation. Radix manages modal focus and Escape behaviour. The design uses custom reusable primitives rather than a dashboard template.

## Shared report rendering

The report application service derives a domain ReportViewModel from recorded report sections or an approval snapshot. Staff and guardian-projected report previews and the lazy-loaded React-PDF renderer receive the same model. RecordedDetails allow future explicitly recorded optional sections. Saving a draft clears approval; approving creates a cloned snapshot. Export has no persistence or messaging side effects. Font assets are local and no private PDF service is called. See REPORTS.md.

## Authenticated multi-academy foundation

The authenticated customer entry is /workspace, with server-checked academy memberships, sport-specific plans, approved report snapshots and private parent messaging. Legacy role routes remain fictional demonstrations. See [MULTI_ACADEMY_FOUNDATION.md](MULTI_ACADEMY_FOUNDATION.md), [SECURITY_AND_DEPLOYMENT.md](SECURITY_AND_DEPLOYMENT.md) and [WORKSPACE_MIGRATION.md](WORKSPACE_MIGRATION.md) for the boundary, migration audit and remaining commercial requirements. External delivery remains NOT_SENT; no real messaging, billing or AI provider is connected.
