# Player development reports

The staff screen `/coach/reports/[reportId]` and private parent view `/parent/reports` share one typed ReportViewModel. The same model supplies the local React-PDF export. Reports explain recorded practice, reviewed evidence and the next development step; they never introduce rankings, grades or universal scores.

Legacy sparse approved reports use their recorded report sections. They are not enriched from a live development plan: its drill assignments, coach reasons or dates may not have been approved for that report. Optional recordedDetails support explicitly recorded drill purpose/activity, reviewed reason, observation criteria and review date. Missing review dates remain “Review date to be confirmed”. The observation count 3 of 6 is an introductory practice observation, not a progress percentage.

Approval captures an immutable content snapshot. Save Draft clears the snapshot and hides the revised report from the parent view. Unsaved remark edits disable export, parent preview and approval until saved as a draft. Parent projection includes only approved reports for the guardian-linked player. Existing browser demo permissions are presentation boundaries, not secure authentication.

PDF generation runs locally in the browser, with selectable text, embedded locally served SIL-licensed Noto Sans fonts, A4 portrait layout, approximately 15 mm side margins, flowing content and repeated branding/privacy footers with pagination. Small evidence cards stay together; unusually long observations can flow across pages. No private record is sent to an external PDF service. Downloads do not change approval or delivery. Loading, generation failure and retry states are visible.

The fictional Aarav October 2026 sample is one page. Screen captures, current/previous downloads, long and missing-data test fixtures, and rendered previews are under docs/screenshots/reports. The supplied attachment contained the request only, so the previous export was captured from the existing app. The sample has no recorded drill names or review date; none were added.

Translated report label overrides are supported by the model. This is not a complete localisation system; additional font coverage and translation review are required for languages beyond the bundled Noto Sans scripts. The PDF is selectable but not a tagged accessible PDF. Secure server-side authorisation, immutable audit storage and authenticated export permissions remain production requirements.
