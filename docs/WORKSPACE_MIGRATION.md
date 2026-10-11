# Migration audit

The original demo loads a single academy fixture and hard-coded fictional player and guardian identities through the browser repository. These remain under the `(demo)` route layout. Moving the provider out of the root layout prevents customer routes from receiving demo records. The public entry page distinguishes authenticated onboarding from fictional demonstration navigation.

No implicit migration imports browser records into customer workspaces. An operator-assisted migration must assign every record an academy, link authenticated staff and verified guardians, map sports and units, validate relationships, redact working notes from approved snapshots and preserve approval history. Do not merge people by name. Archive the source and audit imported ownership before any real customer migration.

Customer UI → workspace feature hook → server application service → repository interface → SQLite adapter preserves the repository boundary. The new typed workspace records extend the foundation without treating a legacy browser role as a server identity. Shared report presentation is reused for authenticated approved snapshots and guarded server-side PDF generation.

Acceptance fixtures are created by automated tests: A football, B cricket, C football plus badminton. They are fictional and isolated. The test-generated database is ignored and should be reset only when local users explicitly intend to remove their test accounts and records.
