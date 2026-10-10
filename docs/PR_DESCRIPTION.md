# Sportozen Academy Concept B product foundation

Build the academy frontend from an empty repository. Owners manage a fictional academy and roster; coaches move from player goals through personalised sessions, attendance, observations, evidence review and report approval; parents see guardian-linked public progress.

The navy/green responsive interface uses a typed domain and versioned browser-storage repository. Seeded evidence now plays a local fictional MP4 with pause, seeking and persisted bookmarks. Real uploads remain unconnected.

Communication supports seven templates, related player/squad/session source snapshots, explicit source verification, editable preview, drafts, internal approval/rejection, history and manual copying. Approval leaves the draft NOT_SENT. Editing clears approval. New messages remain internal and never publish to parent views. Settings exposes four disabled future integration placeholders; a provider interface exists without an implementation or delivery calls.

Validation: lint, strict typecheck, 12 unit tests, production build, and 8 browser scenarios passed (7 existing scenarios plus the corrected communication scenario). Browser coverage includes 36 supported routes, persistent edits, privacy, local PDF download, real video playback, approval/copy flow and responsive overflow checks. Screenshots and exact verification results are in docs/VALIDATION.md.

Remaining scope: authentication, server authorisation, real media/uploads, payments and messaging providers, verified guardian contacts and consent/preferences, fuller entity editing, production audit logs and accessibility review. See docs/ROADMAP.md and docs/COMMUNICATION.md. No application changes have been merged into main.
