# Weekly and monthly extension verification

Synthetic fixtures only; customer databases were not reset. Local preview sign-up was performed separately on the requested local app. Credentials are ignored under `.local`, outside this review.

## Automated checks

- `pnpm lint`, strict `pnpm typecheck`, `pnpm test` (57 tests in 9 files), and `SPORTOZEN_QA_BUILD=1 pnpm build` pass.
- Full `SPORTOZEN_QA_BUILD=1 pnpm test:e2e`: 20 tests pass, including all existing workflows, authenticated training, legacy reports, role privacy and regional workspace isolation.
- New browser coverage runs synthetic India, UK and Australia academies through scheduled session/objective → individual weekly edit/approval → private parent publication without a retrospective report; explicit-month draft → commentary/review → approved parent PDF.
- Staff and parent reports fit 1440, 390 and 320 pixels without horizontal overflow or runtime errors. Existing 768-pixel route regressions also pass. Parent payloads exclude another child and private notes; unlinked/cross-academy PDF requests are denied.
- Unit coverage exercises source invalidation, issued correction history, duplicate/idempotency guards, real attended and missing evidence bases, IANA month boundaries, UK/Australia DST, quiet hours, missed runs, persistent claims, bounded retries, unknown outcomes, exact Meta template verification, signed event deduplication/order, changing contacts, ambiguous replies and opt-outs.
- The production adapter is tested with injected transport doubles only. Worker one-shot was exercised against an isolated fictional SQLite database with sending disabled.

## Visual and PDF evidence

Fixtures and captures are in [screenshots/weekly-monthly](screenshots/weekly-monthly). India/UK/Australia monthly PDFs use the existing premium model with honest missing-data wording. Each is one A4 page, replacing the sparse second-page next-step spill captured in the `before-monthly-*` images. Parent and staff screen wording agrees with the approved source snapshot.

The four-page `long-monthly.pdf` includes a long name with Unicode, 24 long observations and a closing-note end marker. Every page was rendered and inspected, including header, attribution, privacy footer and pagination. Repeated header pixels agree across pages, Unicode text remains selectable, and the full closing note is retained after normalising PDF line breaks. Long and missing-data legacy export fixtures are also rendered and inspected. Body text remains vector text with embedded local fonts; no private content is sent to an external renderer.

The PDF flow stays in the existing renderer. Branding is drawn with independently embedded Noto fonts using PDF-lib to avoid the existing fixed-text continuation defect. See [PDF-lib's custom-font embedding contract](https://pdf-lib.js.org/docs/api/classes/pdfdocument#embedfont).

## Readiness boundaries

No live WhatsApp delivery, WABA/template approval, public webhook subscription, purchase or deployment was performed. The app defaults to disabled/paused schedules and TEST mode. Actual delivery requires the documented credential binding, provider-approved templates, verified consent/recipient, production-only allowlisted test, and an explicit controlled test authorisation.

Migration/rollback, worker supervision, sender-rotation limitations, English-only template support and the inherited SQLite build-tracing warning are documented in [WHATSAPP_WEEKLY_MONTHLY.md](WHATSAPP_WEEKLY_MONTHLY.md). Existing account recovery/MFA, storage deployment, monitoring and retention gaps remain production work.
