# Implementation scope and roadmap

## Implemented frontend workflows

- App shell, role switch, collapsible sidebar, mobile drawer and bottom navigation.
- Owner and coach dashboards with navigation, charts, queues and task toggles.
- Academy identity editing, adding branches, venue/program/staff views and role descriptions.
- 24-player directory with all requested filters, mobile cards, quick-view sheets and validated add-player form.
- Player profile tabs for goals, sessions, evidence, attendance, reports, fees and drafts.
- Player Path, editable goal stages, new goals and weekly development plan.
- Five-step session builder, draft/publish, drill selection and keyboard reorder, individual focuses and evidence plan.
- Personalisation editor, training timer, agenda, attempts/success counter, private observation capture, timestamps and session completion.
- Attendance bulk-present, per-player states/reasons, check-in record and persistent save.
- 12-drill library with search/skill filter, details, adaptations and add-to-session.
- Evidence filters, playable fictional demo MP4, media-driven timeline/bookmarks, linked goals, notes and review states.
- Report draft/approve/revision, evidence review prerequisite, local demo PDF and share preview.
- Demo fee ledger, history and validated payment-reference recording.
- Communication templates, editable drafts and approved Not Sent previews.
- Record-derived analytics and explicit missing-data states.
- Parent home, schedule, progress/path, approved reports, fees, approved previews and More.

## Partial modules / limitations

- Academy venue, program and staff views are read-only. Branding edits academy identity; logo upload is unimplemented. Documents are labelled Not Connected.
- Player creation is a minimal roster form. Editing identity, guardian management, document uploads and full historical event streams remain.
- Session duration uses each drill's configured duration; per-session duration overrides are future work. Calendar is a dated list. Scheduling conflict checks and bulk custom attendance selections remain.
- Profile and dashboard attendance percent is a fictional seeded historical summary. Current-session ledger and analytics use live demo records; a full history/rate aggregation is future work.
- Player paths are seeded displays; formal coach verification history and automatic transitions remain. Weekly plan and goals are editable, but a review audit log is not built.
- Session Desk timer/counters are temporary working controls. Saved observations/evidence persist. Voice capture is disabled. Bookmarking is an observation timestamp; no real video is captured.
- Seeded evidence has a playable fictional practice animation, native video controls, seeking and persistent bookmarks. Coach-note records without media are labelled No video attached. Real player footage, upload/tag management, annotations and video storage remain.
- Reports use seeded structured sections and editable remarks. PDF is a simple locally generated text report, not a designed production document. Sharing is preview only.
- Messages have all seven template labels with starter text, not production editorial templates. Scheduling is metadata only. No scheduling or delivery occurs.
- Analytics excludes unavailable retention and formal plan-review history. No talent scoring.
- Settings provides integration states and demo reset. Production user management and configurable permissions remain.

## Required before production

Authenticated backend with academy isolation, guardian/player permissions, validated APIs, database transactions and audit logs; storage/media access controls; payment provider and verified ledger; reviewed messaging delivery; timezone-aware scheduling; privacy/consent and retention controls; observability, deployment CI and formal accessibility review.

AI recommendations are static demo examples. A future model integration must have documented provenance, evidence quality evaluation, coach approval, error handling and validation across ages/sports before release. No computer vision, predictive, talent or medical capability is claimed.
