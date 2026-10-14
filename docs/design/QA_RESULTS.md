# Football frontend review verification

Design awaiting user approval. Local prototype: `/design-preview`. Source branch: `codex/frontend-figma-design`, based on `76f5c2a` from the weekly/monthly work. Customer routes, server services, migrations, provider integrations and production data are outside this change.

## Checks

| Check | Result |
|---|---|
| Production build, including strict TypeScript | PASS with the inherited dynamic SQLite filesystem-tracing warning |
| ESLint | PASS |
| Unit suite | PASS: 64 tests, including seven preview contract/context tests |
| Browser inventory | PASS: all 121 named screens at 1440px and 390px, 242 captures, no runtime errors or horizontal overflow |
| Additional widths | PASS: representative coach, session, parent, finance, report and platform views at 1280/1024/768/320 |
| Shared states | PASS: empty, loading, validation, failed save, unsaved, conflict, archive, unavailable media, pending template, opt-out and delivery failure; desktop/mobile captures |
| Connected prototype flows | PASS: setup/name propagation, player creation, selected-group override/reset, batch/week changes, per-child weekly approval/publication, observation review, report save/reapproval/export, private parent questions/practice feedback, independent payment outcomes and academy currencies |
| Accessibility | PASS for tested drawer keyboard trap, Escape, focus return, explicit labels, retained failed edits and narrow layouts; not a complete accessibility audit |
| Customer API isolation | No `/api/` requests during named-screen inventory checks |
| Existing browser regression suite | PASS: all 20 existing cases covered, including the separately rerun authenticated regional workspace test |
| PDF verification | Four real local exports, eight A4 pages; all pages rendered and visually reviewed, with identity/period/attribution/delivery text checks |
| Figma authoring and prototype wiring | BLOCKED: Starter MCP quota; file is empty, zero verified screen nodes |

The full regression run had 24 passing cases and two browser-process interruptions (`Target page, context or browser has been closed`) in the desktop inventory and authenticated regional workspace test. Both interrupted cases passed on a bounded separate rerun. The added child-approval assertion initially used a parent-only route and encountered its intended privacy guard; the test was corrected to use the coach editor. Results represent combined runs, not one uninterrupted green full-suite run.

## Review workflows

- Setup: entry → account design → academy identity → region → branch → batch → staff → player → branding → summary → owner home.
- Coaching: today → batch weekly plan → shared drills/order → optional personal/group adjustment → guardian wording preview → explicit approval → parent publication. Editing shared sources clears affected approval/publication. Reset removes the override while retaining the development goal.
- Session: agenda → task objective → four-state attendance → optional observation/result with conditions → review → next step → summary. Missing observations are not failures. Recorded age category stays distinct from training placement.
- Reports: monthly queue → dated sources → editable commentary → save draft → separate review approval → parent preview → PDF/history. October session notes never enter the September fixture. Approval and saved next steps stay with the selected child.
- Family: selected linked child → current focus/confirmed schedule → approved plan/report → optional practice instructions/media → editable private feedback → conversation. Unlinked-child selections show a scope guard.
- Fees: training invoice → proposed method → review → processing simulation → paid/failed/cancelled/partial outcomes → receipt. Manual references remain pending until separately reconciled. An unpaid invoice has no receipt. Platform software invoices remain separate.
- Platform: customer metadata → software subscription/invoice → active/past-due/suspended design → scoped support request. The prototype grants no access.

## Limits

The role selector demonstrates UI roles, not security. Fictional sessionStorage records are replaceable prototype state, not a new customer backend. Access/recovery, invitations, WhatsApp, payments and support grants remain design simulations. Future missing contracts and product decisions are documented in BACKEND_HANDOFF.md. No user design approval is inferred from creation or verification.

The editable Figma review set is incomplete. The authorised account must have additional MCP calls available before library discovery, editable foundations/screens, returned-node mapping, capture verification and prototype wiring can proceed. FIGMA_LEDGER.json records the actual empty destination; no fabricated node URLs are supplied.
