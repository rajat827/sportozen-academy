# Academy finance integration audit

Baseline audited 15 October 2026 against the latest final-portal brief (`7d2466f8-ec58-4be7-9ff3-d0b8af59a21b`), before the finance implementation below was added. This brief supersedes the earlier preview-only scope. Customer finance must use authenticated academy records; preview fixtures remain separate. The subsequent implementation and current verification status are recorded in [ACADEMY_FINANCE.md](ACADEMY_FINANCE.md).

## Existing functionality to preserve and reuse

| Layer | Existing implementation | Reuse |
| --- | --- | --- |
| Authentication | `src/server/auth.ts` and Better Auth sessions | Current server identity for every finance read, mutation and document. |
| Academy authority | `access`, `requireRole`, `requireModule`, `requirePlayer` in `src/server/workspace-access.ts` | Membership, entitlement/module and linked-player boundaries; recheck current permissions inside writes and retries. |
| Persistence | `database`, `atomic`, `audit` in `src/server/database.ts` | The existing persistent SQLite connection, `BEGIN IMMEDIATE` transaction and academy audit trail. No reset or duplicate database. |
| Existing fee records | `WorkspaceMoney` in `src/domain/workspace.ts`, `saveRecord('fee')` in `src/server/workspace-service.ts`, generic workspace repository | Preserve `{playerId, amountMinor, currency, label}` as labelled historical records. They contain no due period, verification or invoice semantics; do not silently convert them to paid invoices. |
| Generic API safety | Workspace route handlers, `sameOrigin`, `privateJson`, `apiError` | Same-origin writes, no-store private responses, consistent validation/access errors. |
| Hook boundary | `workspaceRequest` and `useWorkspace` in `src/hooks/use-workspace.ts` | Credentialed, no-store fetch and mutation/reload/error patterns. A focused finance hook can call its own authenticated route. |
| Transaction reliability | `trainingAction` in `src/server/training-service.ts` | Current-membership rechecks, UUID/digest retry receipts, atomic history/audit and stale-version rejection. |
| UI primitives | `Card`, `Button`, `Badge`, `Sheet`, existing forms/tables and approved shell | Real editable customer controls, accessible feedback and the locked visual layout. |
| Finance visual/story references | `src/features/design-preview/payment-screens.tsx`, approved Fees reference | Invoice detail, manual submission/verification, partial/failed/receipt visual hierarchy only. Do not import `previewAdapter`, sample invoice identifiers, sample balances or simulated provider results into customer pages. |
| Isolated test setup | `tests/unit/period-communication.test.ts` and migration tests | Temporary unique SQLite paths, mocked authentication/provider boundaries and database rollback tests without customer data. |

No payment gateway SDK, merchant configuration, signed payment callback, real finance repository, finance action route or authenticated invoice/receipt export was found. Provider-acceptance receipts in the WhatsApp worker are delivery records, not payment receipts.

## Gaps found in the baseline

- The authenticated workspace has no Fees tab or fee-management feature component. Its bootstrap includes generic `fee` records, but there are no fee plans, dated charges, discounts/adjustment approvals, invoice identifiers, payment submission/verification, verified allocations, receipts, fee reminders or collection summaries.
- `visibleRecords` currently exposes an assigned player's `fee` rows to a coach. A hidden finance navigation item does not prevent this bootstrap/direct-read data exposure. Finance reads must exclude Coach and Support unless an actual future finance-grant model exists. Existing generic fee writes already require Owner/Admin.
- Parent generic fee reads use guardian relationships, but do not constitute a complete private fee account. New records must retain academy/player/guardian checks and exclude staff-only verification notes.
- Legacy `/owner/fees` is a browser demonstration. Its `useAcademy` save appends a record and changes `feeStatus`; it is not an authenticated verification workflow. Existing `operations.spec.ts` covers that demonstration, not customer finance.
- Preview reconciliation and receipt tests verify fictional adapter behaviour. They do not prove persistent customer accounting, duplicate prevention, receipts, tenant isolation or restart survival.
- There is no evidence of a connected online payment gateway. Customer online collection must remain explicitly unavailable. No automated test should charge or transmit real payment details.

## Smallest safe first-release implementation

1. Add a focused finance domain, repository, service and `/api/workspaces/[academyId]/finance` boundary using the existing database and session authority. Keep finance tables academy-scoped and separate from Sportozen subscription metadata. Register only additive schema creation; preserve all old records and approvals.
2. Owner/Admin creates an academy plan and issues a player charge with an explicit billing period, currency and due date. Persist the issued invoice snapshot/identifier. Use integer minor units and one currency per invoice; never sum different currencies as one amount.
3. A linked Parent or Owner/Admin submits an actual manually recorded payment reference and amount for that invoice. Persist it as **PENDING**. A submitted reference does not change invoice paid amount, outstanding balance or receipt availability.
4. Owner/Admin explicitly matches the reference/amount and records a verification decision. A successful verification atomically stores its actor/time, a verified financial event and an immutable academy receipt snapshot. A rejection records the decision without reducing the balance. Repeated requests are idempotent; a reference cannot credit multiple invoices accidentally.
5. Owner/Admin may record a reviewed discount/adjustment with a reason and actor/time. Approved adjustments are separate immutable financial events. Prevent negative balances and changes that erase the relationship between verified payments and their receipts.
6. Derive paid, partial, pending and overdue indicators from the dated invoice, approved adjustments and verified payments. Retain a separate overdue flag for partially paid late invoices. Pending/rejected references never count as collections. Collection summaries group by currency.
7. Persist deliberate private in-app reminder records for still-outstanding invoices, addressed to the current linked guardians. External delivery remains **NOT_SENT / NOT_CONNECTED** until a separately authorised configured delivery path exists. Do not use a payment reminder to bypass recipient consent or send real messages.
8. Expose the correct player fee panel, fee history and branded invoice/verified-receipt documents to authorised staff or linked guardians. Customer data comes from the finance hook/service, not the preview adapter. Preserve approved screen proportions and responsive hierarchy.

## Required verification

- Owner/Admin can create plans/invoices; Coach, Parent and Support cannot create charges or approve adjustments/verification.
- Linked parents see only their child's account and cannot guess another academy/player/invoice/receipt ID. Revoked or expired memberships and changed guardian relationships block reads, writes, exports and identical retries.
- A pending reference leaves balances unchanged and produces no receipt. Partial verification leaves the correct remainder; full verified settlement yields Paid. Rejection preserves the outstanding amount.
- Duplicate reference, duplicate command, request-key reuse, stale version, concurrent competing settlements and overpayment cannot double-credit or create contradictory receipts.
- Failed SQLite writes roll back invoice/payment/receipt/history/audit/request-receipt changes together. A retry after a synthetic database failure creates exactly one committed result.
- Discounts/adjustments require reviewed justification, are audited and cannot drive the invoice below verified collections. Currency mismatch, fractional/unsafe minor amounts and invalid periods/dates are rejected.
- Stored records, verification decisions and issued document snapshots survive a new database connection/restart. Additive migrations are rerunnable and preserve legacy records.
- Actual authenticated browser tests cover plan → invoice → parent reference → owner verification → private receipt, with real reloads, correct player selection, phone widths and approved-reference comparisons. External calls use doubles; no real money or messages move.

Shared-source edits need coordination: database migration registration, generic `fee` read restrictions and the authenticated portal shell/hook integration. New finance domain/repository/service/tests can be authored in unique files independently.
