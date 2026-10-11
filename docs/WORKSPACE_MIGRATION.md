# Migration audit

The original demo loads a single academy fixture and hard-coded fictional player and guardian identities through the browser repository. These remain under the `(demo)` route layout. Moving the provider out of the root layout prevents customer routes from receiving demo records. The public entry page distinguishes authenticated onboarding from fictional demonstration navigation.

No implicit migration imports browser records into customer workspaces. An operator-assisted migration must assign every record an academy, link authenticated staff and verified guardians, map sports and units, validate relationships, redact working notes from approved snapshots and preserve approval history. Do not merge people by name. Archive the source and audit imported ownership before any real customer migration.

Customer UI → workspace feature hook → server application service → repository interface → SQLite adapter preserves the repository boundary. The new typed workspace records extend the foundation without treating a legacy browser role as a server identity. Shared report presentation is reused for authenticated approved snapshots and guarded server-side PDF generation.

Current acceptance fixtures are three independent football academies: India/INR/Asia-Kolkata, UK/GBP/Europe-London, Australia/AUD/Australia-Perth. All accounts and records are fictional and use a guarded test database, never `.local/workspaces.sqlite`.

The football-only scope change performs no destructive database migration. Existing other-sport records, approval history and enrolments remain unchanged. Customer reads and direct downloads exclude them; edits/creation/activation for unsupported sports are rejected. Saving settings enables football without dropping historical configuration. An academy that previously had only another sport starts with no visible football players; its owner/admin can save configuration to enable football. No historic child/plan/drill is relabelled. Legacy retrieval is restricted to an authorised operator backup/export procedure outside customer APIs, requiring ownership validation and an audit; no new historical customer editor is exposed.
