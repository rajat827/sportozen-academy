# Actual portal browser evidence

These are native browser captures of the authenticated application backed by isolated synthetic SQLite records, not screenshots of the design-preview fixtures. Full verification, routes, observed limitations and nine inspected reference comparisons are indexed in [Academy portal QA](../../ACADEMY_PORTAL_QA.md).

`capture.json` records the 40 viewports, actual selected record IDs, loaded fonts/assets, zero document overflow and native table panning. Each viewport PNG has a matching full-page variant. `comparisons/` contains approved reference / actual browser / remaining differences with source hashes; `scheduling/` demonstrates actual Calendar/Training interactions. The two monthly PDFs and verified receipt are private synthetic QA exports.

Historical baselines and diagnostic frames remain local and are excluded from the integration commit. Authentication traces, raw error contexts, databases and review credentials stay only in ignored `.local/`. Visual approval is pending with the user.
