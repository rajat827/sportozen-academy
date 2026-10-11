# Communication preparation and approval

Football-only release. Multiple independent academies. Personalised player development. No rankings. Customer updates reference approved football records. Historical other-sport updates and linked conversations are preserved in restricted storage and excluded from customer APIs. No external provider or clinical nutrition capability was added.

Authenticated workspaces separate approval, private in-app publication and external delivery. Approved-source development updates and optional academy-approved nutrition can reach linked, opted-in parents in-app; private replies work and internal notes stay hidden. External delivery remains NOT_SENT. Approval history snapshots the source and message version. See MULTI_ACADEMY_FOUNDATION.md.

## Legacy fictional communication preparation

Current flow: Communication UI → `useMessageDrafts` → Message Draft Service → Approval Workflow → repository/storage → NOT_SENT.

The seven supported templates prepare snapshots of player, squad, session, attendance, charge/payment, reviewed evidence or approved report records as appropriate. The user verifies those snapshots and edited details before requesting internal approval. Reviewers approve or reject pending drafts. Approval records APPROVED in the activity history and leaves the draft at NOT_SENT with approval metadata. No delivery occurs. Saving a revision clears approval. Copy Message copies only the saved approved content and logs manual copying without claiming delivery.

Statuses: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, NOT_SENT. Delivery status is always NOT_SENT. Legacy demo status/channel values migrate to internal drafts without invented approval or delivery history.

Parent/player message rendering accepts explicitly marked fictional demo fixtures only. New coach drafts never become such fixtures, including after approval. Internal approval does not publish them to parent/player views. Demo role switching is navigation, not production authorisation; authenticated reviewer identity and immutable audit logs require a backend.

Settings → Integrations lists disconnected future messaging capabilities. It contains no credentials forms or active connection actions. No provider is instantiated and no provider API is called. `MessagingProvider` is a contract only; UI and draft services do not depend on a concrete provider.

Future boundary: Communication UI → Message Draft Service → Approval Workflow → Messaging Provider Interface → future WhatsApp / Email / SMS / Push adapter.

Future provider delivery must require an approved, unchanged draft; verified guardian contact; recorded consent and communication preferences; provider-approved templates where required; provider API execution; and real delivery status plus an audit log. These capabilities are not implemented. Credentials and webhook configuration are outside this release. Provider-generated delivery states must not be introduced until a real adapter exists. Manual copying does not bypass or claim these checks.

## Report download boundary

Approving a report makes it available in the linked private parent report view. Generating or downloading its PDF does not send a message, publish a communication update or change external delivery. The report displays approval and External delivery: Not sent separately. Messaging provider behaviour is unchanged by the report redesign.

## Authenticated multi-academy foundation

The authenticated customer entry is /workspace, with server-checked academy memberships, sport-specific plans, approved report snapshots and private parent messaging. Legacy role routes remain fictional demonstrations. See [MULTI_ACADEMY_FOUNDATION.md](MULTI_ACADEMY_FOUNDATION.md), [SECURITY_AND_DEPLOYMENT.md](SECURITY_AND_DEPLOYMENT.md) and [WORKSPACE_MIGRATION.md](WORKSPACE_MIGRATION.md) for the boundary, migration audit and remaining commercial requirements. External delivery remains NOT_SENT; no real messaging, billing or AI provider is connected.
