# Backend handoff — design proposals only

Status: **Design awaiting user approval. No backend contracts implemented by this phase.**

The `/design-preview` routes use typed fictional fixtures and a replaceable session-storage adapter. Role controls are review tools, not authorisation. Simulated delivery/payment states never establish actual delivery, collection, consent, identity or reconciliation.

| Screen area | Existing boundaries to reuse after explicit authorisation | Required data / proposed missing contract | Permissions and validation to retain |
| --- | --- | --- | --- |
| Access / invitations | Better Auth, current sign-in and invitation-acceptance services | Recovery-request UI needs the existing recovery gap resolved; wrong-account/expired outcomes need typed error projection | Real server sessions, invitation digest/expiry, invited email, active membership; do not infer identity from prototype role |
| Onboarding / academy | Workspace creation and academy structure services/repository | Academy identity, local branding asset, IANA region, branch, batch/squad, coach and player records; deliberate per-step completion | Owner/Admin, entitlement, valid football scope; sanitise branding; current records/IDs remain intact |
| Staff / permissions | Membership/invitation and coach-assignment services | Scoped branch/batch assignments; role read model and permission explanations | Platform administration cannot grant itself child access; current membership and assignment on every write |
| Player / guardian | Existing player plans, guardian relationships, support grants | Recorded DOB/age category distinct from training batch and development goal; independently verified relationship/contact | Assigned coach, linked guardian and active academy; no silent first-player substitution |
| Training placement | Existing player/session data as context | **Proposed** PlacementReview: reason, observation references, optional task/group trial, applicable rule/academy/guardian checks, review date, decision/history | No universal playing-up rule; age category unchanged; governing rules and guardian/academy conditions need product/legal review before implementation |
| Batch-first weekly planning | Existing session objectives, drill snapshots, WorkspacePlan and weekly period service | **Proposed** SharedBatchPlan plus per-player/group Override references. Default inheritance, explicit reset and source versions need reconciliation with current independently approved weekly snapshots | Goal remains context; one adaptation edit; changed shared sources invalidate affected approved messages; independent per-child approval/publication |
| Drills / sessions | Current training application service and academy-owned curriculum | Approved drill versions, setup assets, task conditions, dated agenda, roster, four attendance states, optional defined result | Authorised session coach and all applicable player scopes; unmarked/missing never becomes zero or failed; version/idempotency guards |
| Weekly parent communication | Existing communication settings/repository, weekly approval/private projection, queue/provider interface and signed webhook services | Current academy, child, guardian, consent/contact, period, preview, per-recipient delivery; schedule and provider setup remain disconnected in this prototype | Existing server enable flags and template checks; approval/publication/delivery separate; no real send until separately authorised |
| Monthly reports / print | ReportViewModel, approveReport, approval history and private PDF route | Explicit zoned month, eligible reviewed sources, completed participation, marked attendance basis, commentary, next priorities; historical snapshots/corrections | Only eligible source period, authorised child, no staff/private notes; final human review; immutable approved snapshot; PDF download never publishes |
| Academy training fees | Existing demo financial records and authenticated fee-reference boundaries | **Proposed** FeePlan, dated Charge/Invoice, scholarship approval, PaymentAttempt, verified allocation, receipt and refund-review read models | Owner/Admin finance authority; academy/child/currency scope; balance derived from verified allocations; submitted references are pending, not paid |
| Parent payment journey | Existing private parent workspace and fee records | **Future authorised integration** merchant/account eligibility, proposed India/overseas methods, checkout/tokenisation, provider callbacks, attempt idempotency, partial allocation, receipt/refund reconciliation | Never collect real details in prototype; guardian child/invoice scope; secure provider process; signed callbacks; no success from browser state alone |
| Parent home / practice / messages | Existing parent projection, approved practice activities, private conversation services | Approved linked-child focus/activity/cue, optional attached demonstration, editable help feedback | No independent child account; no invented video or home activity; feedback is conversation text, never evidence, completion or a score |
| Preferences / consent | Current guardian contact/preferences and communication services | Category choices, quiet hours, verification provenance, academy-named opt-in, provider configuration states | Parents cannot self-verify; contact check distinct from consent; unsupported languages/providers remain unavailable |
| Sportozen administration | Platform account metadata, entitlements and audited support access | **Proposed** Software subscription/invoice/attempt read model, separately from academy training invoices | Customer metadata only by default; child access requires academy-approved scoped expiring grant; separate currency/balance/receipts |
| Shared states | Existing unsaved-change guard, Radix dialogs, optimistic expected-version commands | Field validation, retained draft retry, stale-version projection, read-only archive and media availability | Never silently overwrite conflicting versions; visible labels/focus, touch targets, honest missing data |
| Upcoming AI | Existing coach-led product | Coming soon presentation only | No analysis, upload-to-AI, fabricated score, inferred weakness or release-date promise |

## Proposed adapter shape

The preview adapter exposes `read`, `save`, `subscribe` and preview-only `reset`. It stores only under `sportozen-design-preview-v1` in sessionStorage. Replacing it later must use feature hooks → authorised application services → current repository/storage boundaries. Do not connect these direct fictional transitions to production mutations without reviewed service contracts.

Invoice fixtures keep two flows distinct: training fees from parent to academy, and software subscription fees from academy to Sportozen. INR and GBP are separate fixtures; no exchange or combined balance is shown. Payment references, verification and refund controls are simulations. Provider/merchant choices are open decisions, not selections made by this design.

September report facts are deliberately separate from the October session preview. The current observation does not enter September's source period. The long PDF extends commentary explaining the same recorded source; it does not manufacture more evidence. Limited-evidence fixtures remain explicit.

## Open decisions for the design review

- Shared batch-plan inheritance and personal-override granularity versus current independently approved weekly records.
- Staff finance permissions, scholarship authority, refund policy and reconciliation ownership.
- Merchant/payment methods and geography after provider/account eligibility review.
- Training-placement trial policies by academy, applicable governing rules and guardian checks.
- Localisation, academy logo upload/validation, recovery/MFA, retention, accessibility testing and real-user evaluation.
- Figma authoring/prototype wiring after the current Starter MCP tool quota block is resolved.

Approval of these frontend screens will not itself authorise backend coding, integrations, purchases, real sends, merging or deployment.
