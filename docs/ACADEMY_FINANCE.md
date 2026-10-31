# Persistent academy training fees

The customer Fees feature uses the existing authenticated workspace and persistent database. It imports no preview adapter, browser demonstration storage or sample invoice data. Sportozen software subscription records remain separate.

## Boundaries and records

`PortalFees` → `useFinance` / `useWorkspace.finance` → authenticated finance route → `financeAction` / `financeView` → academy finance repository → existing SQLite database.

- Owner/Admin can create/archive plans, issue player invoices, record references, verify/reject references, approve reasoned credit/debit adjustments and publish private in-app reminders.
- Parents have read-only access to their currently linked football children. Verification notes are removed from parent payloads. Coach/Support have no finance reads or mutations, including the legacy bootstrap `fee` rows.
- Every service call rechecks current membership, entitlement, module and football scope. Writes recheck inside `BEGIN IMMEDIATE`; reads and PDF exports enforce current player scope. PDF access checks the selected child again after asynchronous rendering.
- Migration `004-academy-finance.ts` adds records, unique reference/receipt indexes, submission receipts and version history. It does not rewrite generic historical fee rows, assign them due dates, or manufacture verified invoices from them. Legacy records are separately labelled in the UI and excluded from new collection summaries.

Issued invoices preserve academy/player branding and their original charge, period and due date. Verified receipts preserve the issued document identity and actual verified amount. Plan changes do not rewrite issued invoices. Receipts and adjustment/reminder events are immutable; record versions, history and audit preserve decisions.

## Manual payment workflow

1. Create a plan or individual charge; issue a dated invoice to an authorised player.
2. Record amount, currency, payment date, method and manual reference. This creates **PENDING** only. The balance and receipts remain unchanged.
3. An Owner/Admin explicitly matches the reference and amount, records a note and confirms review. Verification atomically stores the payment decision, invoice version, verified receipt, history, audit and request receipt.
4. The account derives Paid, Partial, Pending or Overdue from approved financial events. A full approved waiver is labelled **WAIVED**, not Paid. A partially paid late invoice retains its overdue flag.

UUID/digest request receipts make identical retries idempotent and reject reuse for different content. A normalized reference cannot be credited more than once within an academy. Competing settlements recheck the current balance inside the write transaction; overpayment is rejected. Credits cannot remove already verified collections. New writes prevent individual and aggregate safe-integer overflow. All amounts use integer minor units; input/display helpers respect zero-, two- and three-decimal currencies without floating-point rounding. Summaries never combine currencies.

If the server confirms a save but a subsequent refresh fails, the hook returns the confirmed result and shows a refresh warning. A failed/unconfirmed mutation retains the draft and reuses its submission key for a matching retry. Review checkboxes reset when the underlying invoice/payment version changes. Unsaved fee editor text stays in component memory and is guarded on dismissal/navigation; it is not written to URLs or browser storage.

## API and documents

- `GET /api/workspaces/[academyId]/finance?player=...` returns `FinancePayload`, optionally narrowed to an authorised child. It includes separate currency summaries, invoice read models, references, approved adjustments, verified receipts, private reminders and labelled legacy records.
- `POST /api/workspaces/[academyId]/finance` accepts `{requestId,action,id?,expectedVersion?,data}`. Actions: `plan`, `invoice`, `reference`, `verify`, `reject`, `adjustment`, `reminder`. See `src/domain/finance.ts` and service validation for fields.
- `GET /api/workspaces/[academyId]/finance/invoice/[id]/pdf` exports the issued invoice with current recorded balance clearly dated.
- `GET /api/workspaces/[academyId]/finance/receipt/[id]/pdf` exports an immutable verified-payment receipt. An unverified reference has no receipt to export.

PDFs use existing `pdf-lib`, fontkit and self-hosted Noto fonts, customer academy branding and a discreet Powered by Sportozen attribution. Responses are private/no-store and exports are audited. No public document links are created.

## Operational limits and verification

Online collection is **NOT_CONNECTED**. This feature does not charge, execute refunds or call an external payment provider. Reminders are published only inside the private app to currently linked parent members; external delivery stays **NOT_SENT**. No new WhatsApp/payment transport is invented. Payment reversals/refunds require a separate audited financial-event workflow; editing an existing verified receipt is not provided.

Verification on 15 October 2026: the coordinated full suite passed **175 unit tests**, including **33 financial cases** (27 service/permission/transaction/PDF cases, 2 exact-money cases and 4 actual-Noto-font wrapping regressions). Full lint and final production compilation/TypeScript passed. Tests use unique temporary SQLite files and synthetic users/records; no customer database reset or real external send/charge occurred. Coverage includes pending/partial/full/rejected/waived states, currency separation, stale versions, duplicate/retry keys, rollback, restart, preserved legacy rows, Coach/Support bootstrap privacy, child-scoped PDFs and readable document wrapping.

The final real bundled-Chromium portal run passed both master cases on the final build: actual finance UI workflow, failed-save draft retention/retry, verified receipt, parent/Coach/other-family boundaries, two server restarts and finance persistence, with no browser page errors or external requests. All 40 viewport image pairs have zero document overflow. Native table and tab panning/last-tab selection pass; financial values fit on one visual line at all captured widths. Linked guardian names and canonical Message Parent/View Player Profile navigation are asserted. Earlier overflow and split-decimal findings were corrected before this pass. The saved actual receipt was rendered and inspected after the word-wrapping correction; see [portal evidence](ACADEMY_PORTAL_QA.md).

Baseline captures and manifest are preserved under `docs/screenshots/academy-portal/baseline-58115/`. Raw traces/error contexts remain only in ignored `.local/portal-browser-diagnostics/`; they are excluded from committed evidence because they can contain synthetic authentication details. Review logins are written only to ignored `.local/` after the entire master case passes. Functional checks and screenshots do not grant visual approval.
