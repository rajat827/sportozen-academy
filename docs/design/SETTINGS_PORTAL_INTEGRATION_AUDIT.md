# Settings integration audit — 15 October 2026

The final portal brief supersedes the preview-only delivery scope. The Settings preview is a visual/reference implementation, not a customer data source. The approved ZIP must be opened and its Settings panel compared before further frontend changes. Integration work belongs on `codex/academy-portal-integration` under the coordinator's selected lineage.

## Existing customer boundaries

| Concern | Existing implementation | Integration use |
| --- | --- | --- |
| Authenticated workspace | `src/hooks/use-workspace.ts`, `/api/workspaces/[academyId]` | Reuse actual payload, busy/error state, reload and mutations. |
| Academy configuration | `AcademyConfiguration`, `academySchema`, `updateAcademy` | `w.configure()` calls academy-scoped PATCH; existing OWNER/ADMIN check, same-origin protection and audit remain. |
| Persistence | `academy_workspaces.config` JSON in existing SQLite | Add compatible optional fields/defaults; no reset or replacement store. |
| Branches | `WorkspaceBranch`, `w.save("branch", ...)` | Existing owner/admin records with IANA timezone validation. |
| Venues | `FootballVenue`, `w.training({action:"venue",requestId,id,expectedVersion,data})` | Existing academy/branch validation, record version, audit and idempotent submissions. No duplicate venue store. |
| Staff | workspace members, `invite`, `revokeMembership` | Reuse permission checks, single-use manually shared invitation tokens and guarded revocation. OWNER cannot be revoked. |
| Notifications/WhatsApp | `useCommunication`, `CommunicationSettingsPanel`, `ParentPreferences` | Reuse existing settings/version/provider boundary. Parent projection is restricted; provider secrets remain server-only. No live send during integration tests. |
| Subscription | `platform_entitlements` | Persisted tier/modules/status exist, but customer workspace payload does not expose an approved subscription summary. No price/gateway/checkout record exists. Add a minimal owner/admin projection; do not expose platform controls or invent billing values. |
| Account | Existing Better Auth and membership data | Use real signed-in identity and existing account/sign-out flow. No preview role/identity selector. |

The current customer `AcademyForm` already persists name, contact email, country, language, currency, timezone, date locale, measurement system, brand accent, PNG logo, configured age groups, review frequency, modules and explicit demo status. Creation starts an empty academy. Existing field support must survive the new composition, including useful settings absent from the screenshot via the appropriate existing tab or advanced section.

## Required compatible additions

1. Academy profile/contact fields: optional location, about text, phone and website with server validation. Use actual empty values for older academies, not Riverside defaults. The supplied description limit is 250 characters; validate and calculate its actual count. PNG remains the existing supported asset format/limit unless deliberately extended with matching server validation.
2. Explicit display preferences: persisted week start, date-format and 12/24-hour time-format choices. Calendar and other portal formatters must consume them. Language remains an actual stored preference; a selector must not claim a translated interface that does not exist. Age display/configuration must not reclassify children or rewrite dates of birth.
3. Academy configuration concurrency: the existing academy PATCH has no version check. Add a compatible `configVersion` defaulting to zero for legacy JSON, return it in the authorised payload, require the client's expected version on update, and atomically reject stale writes with 409. Preserve the form draft and expose conflict review; a success requires the returned saved record plus reload confirmation.
4. Branch edit concurrency should be strengthened where it lacks a record version, while preserving its existing IDs and session relationships.
5. Zones: no venue-zone domain or persistence contract exists. Choose the shared Calendar/Training model first, then use the same stable academy/venue/branch IDs from Settings. A generic `workspace_records` kind or additive venue JSON may suffice without another physical table; do not implement a second independent zone store. Historical sessions retain their recorded location/time snapshots.
6. Customer subscription summary: project only authorised tier/modules/status from existing entitlements. Omit unavailable amounts, Pro/unlimited/priority claims and live management controls. Coaches and parents do not acquire subscription or deletion rights.

The database already stores extensible JSON configuration and records, so these settings additions do not inherently require destructive SQL changes. Add an idempotent migration only when the chosen schema actually needs one. Existing sessions carry their own timezone and resolved UTC/local timestamps; updating academy defaults must not silently reschedule them. Calendar/Training owns how newly created sessions use branch defaults.

## Presenter boundary and ownership dependencies

Extract the approved form/card layout into a component receiving actual academy values, draft/error/dirty/busy state, permitted actions, venues/branches, tab destinations and subscription projection as props. A feature hook should own HTTP save/reload/field-error/conflict behavior through `useWorkspace`; application services own validation, scope, versions and persistence. The customer presenter must not import `previewAdapter`, fixtures, preview route helpers, scenario controls or `ApprovedWorkspaceShell`, which currently reads fictional profiles.

The coordinator owns the real portal shell, route/tab contract and integration branch. Settings owns its presenter/hook and configuration service additions after those interfaces are agreed. Calendar/Training must coordinate the zone model, week start and formatting helpers. Staff, notification, WhatsApp and account tabs should compose existing supported workflows rather than replace them. Finance owns fee data; Settings only displays the separate academy software subscription projection.

Two existing hook behaviors need explicit treatment: `useWorkspace.mutate` combines mutation and reload in one catch, so it currently loses the confirmed mutation response if refresh fails. Settings must distinguish a rejected write from a confirmed write whose workspace refresh failed. `useWorkspace` also retains old data when its academyId argument changes; the actual portal should key its controller by academyId or clear the old scope before loading, especially for an inaccessible target. No shared hook changes have been made here.

## Exact source transfer manifest

All paths below are relative to the Settings worktree. Do not bulk-copy a worktree or generated runtime state.

New, uniquely owned source/assets/evidence:

- `src/features/design-preview/approved-settings.tsx`
- `src/features/design-preview/approved-settings.css`
- `src/features/design-preview/settings-model.ts`
- `src/features/design-preview/approved-workspace-shell.tsx` (the coordinator already has an earlier copy; use this final API).
- `tests/unit/settings-model.test.ts`
- `tests/e2e/settings-ui.spec.ts`
- `scripts/settings-ui-comparison.py`
- `public/design-preview/approved-settings/riverside-logo.png`
- `docs/reference/approved-ui/settings-screen.png`
- `docs/reference/approved-ui/settings-assets.json`
- `docs/screenshots/settings-ui/` (before/after images, comparison, provenance, metrics and README).
- `docs/design/SETTINGS_PORTAL_INTEGRATION_AUDIT.md`

Shared files requiring a scoped merge, not replacement:

- `src/features/design-preview/adapter.ts`: additive `saveConfirmed`, non-persisted reset generation.
- `src/hooks/use-unsaved-changes.ts`: optional discard callback; default callers keep existing behavior.
- `src/features/design-preview/catalog.ts`: only academy-settings metadata title becomes `Settings`.
- `src/features/design-preview/preview.tsx`: scoped Settings dispatch and role prop.
- `src/app/design-preview/[screen]/page.tsx`: explicit Settings permission-preview query prop.
- `docs/design/UI_LOCK.md`, `docs/design/UI_REFERENCE_MAP.md`: retain both scoped Settings sections and all newer reference/global-integration instructions.

Exclude `node_modules`, `.next*`, `.local`, test results and generated `next-env.d.ts`. No Settings commit/PR has been created. No shared root files were edited by this subtask. The preview evidence README records checks, source-after-capture hardenings and remaining visual differences; the final authenticated artifact needs its own matching screenshots, service/regression checks and tested commit.
