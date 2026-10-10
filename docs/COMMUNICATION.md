# Communication preparation and approval

Current flow: Communication UI → `useMessageDrafts` → Message Draft Service → Approval Workflow → repository/storage → NOT_SENT.

The seven supported templates prepare snapshots of player, squad, session, attendance, charge/payment, reviewed evidence or approved report records as appropriate. The user verifies those snapshots and edited details before requesting internal approval. Reviewers approve or reject pending drafts. Approval records APPROVED in the activity history and leaves the draft at NOT_SENT with approval metadata. No delivery occurs. Saving a revision clears approval. Copy Message copies only the saved approved content and logs manual copying without claiming delivery.

Statuses: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, NOT_SENT. Delivery status is always NOT_SENT. Legacy demo status/channel values migrate to internal drafts without invented approval or delivery history.

Parent/player message rendering accepts explicitly marked fictional demo fixtures only. New coach drafts never become such fixtures, including after approval. Internal approval does not publish them to parent/player views. Demo role switching is navigation, not production authorisation; authenticated reviewer identity and immutable audit logs require a backend.

Settings → Integrations lists disconnected future messaging capabilities. It contains no credentials forms or active connection actions. No provider is instantiated and no provider API is called. `MessagingProvider` is a contract only; UI and draft services do not depend on a concrete provider.

Future boundary: Communication UI → Message Draft Service → Approval Workflow → Messaging Provider Interface → future WhatsApp / Email / SMS / Push adapter.

Future provider delivery must require an approved, unchanged draft; verified guardian contact; recorded consent and communication preferences; provider-approved templates where required; provider API execution; and real delivery status plus an audit log. These capabilities are not implemented. Credentials and webhook configuration are outside this release. Provider-generated delivery states must not be introduced until a real adapter exists. Manual copying does not bypass or claim these checks.
