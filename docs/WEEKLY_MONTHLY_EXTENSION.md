# Weekly plans and monthly reports extension map

Base: `codex/coach-parent-ux-simplification` at `de8ed89`; remote inspection found no newer descendant. Preserve the untracked QA screenshot.

| Existing boundary | Reuse | Minimum addition |
| --- | --- | --- |
| Training → useWorkspace → authenticated service | Squad, scheduled session/objective/drill snapshots and player plans | Versioned player weekly snapshots with independent review |
| Reports → approveReport → ReportViewModel → premium PDF | Existing approval history, private parent projection and PDF route | Explicit zoned month boundaries and frozen attendance/session sources |
| Messages and private conversations | Approved updates, explicit publication, guardian relationships | Weekly source reference, per-recipient queue and channel-labelled replies |
| SQLite repository and transactional receipts | Existing storage, audit and short BEGIN IMMEDIATE writes | Additive communication tables, persistent claims/events and worker |
| Academy Settings and preferences | Existing role checks and configuration UI | Schedules, verified consent/contact, sender credential references |

No deployment or live sends are authorised. Real sending defaults off; local tests use synthetic recipients and transport doubles. Legacy fictional routes remain demonstrations.
