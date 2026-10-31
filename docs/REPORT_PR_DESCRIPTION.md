# Redesign player development reports and PDF export

The previous player report included unsupported attendance/strengths text, while its PDF was a plain fixed-line export. Staff and linked parents now see a branded report focused on recorded practice, coach-reviewed evidence and next steps. The downloadable A4 PDF uses the same approved view model and preserves the sparse Aarav sample without adding drills, review dates, scores or improvement claims.

- Add a typed report model and approval snapshots, optional recorded details and translated label overrides.
- Use responsive navy/green report sections with controls outside the document and parent-only approved projection.
- Render selectable text through React-PDF with local embedded fonts, flowing page breaks, repeated headers/footers and PDF-lib pagination. The sparse sample is one page; long observations continue without truncation.
- Keep downloads independent of delivery and approvals; unsaved changes disable export, and saved edits require reapproval.
- Add generation failure/retry, actual download/privacy tests and PDF fact/geometry checks. Refresh legacy communication selectors to explicitly target source verification and fix inherited lint errors.

Validation: lint, typecheck, 17 unit tests, production build and 15 browser scenarios. PDF validation covers the actual downloaded sample/repeat, a three-page long report and missing-record fixture; all pages rendered and inspected. Six-width screenshots, before/after exports and preview images are in docs/screenshots/reports.

Base: codex/personalised-player-parent-updates preserves the latest local player/communication implementation as a checkpoint. This PR isolates the report redesign from that existing work. No external messaging or billing integration is added. Demo role switching remains unauthenticated; production authorisation and accessible tagged PDFs remain separate requirements.
