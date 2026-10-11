# Independent academy workspaces

One Next.js application serves independent academy customers. `/workspace` lists only the authenticated account’s active memberships. `/workspace/[academyId]` names the current academy and enabled sport. Academy switching performs a full navigation to discard private React/router state; private records are fetched without client storage or shared query caches. The server rechecks membership on every operation, including PDF export. Revocation takes effect with the existing session cookie.

Football-only release. Multiple independent academies. Personalised player development. No rankings.

Onboarding creates an empty football academy with region, currency, language, time zone, units, modules and brand colour. Owners can add branches, football programmes, staff, players and explicitly verified guardian invitations. Invitations are single-use, email-bound tokens for manual sharing, not simulated email delivery. Children are never merged by names or account email across academies. Explicit fictional-demo academies can load an example only into an empty workspace.

Only football is present in the operational configuration. The existing close-control template can be copied into academy-owned curriculum; additional focus choices do not manufacture drills or assessments. Historical other-sport enrolments, records and approval history remain in restricted storage, with no customer API/UI/export access. Football activation is server-validated. AI analysis remains unavailable. See FOOTBALL_ONLY_RELEASE.md.

The working minimum flow is authenticated membership → academy and sport → player → assigned academy drills → individual plan → recorded observation → verified report approval → linked parent’s approved plan and report. Screen and PDF use the saved approved report snapshot. Editing a report clears its current approval; historical approval snapshots remain in the database. No rankings, talent predictions or comparisons between children are created. Missing evidence is not a negative score.

Development updates reference an approved report. Draft, pending approval, approved and rejected states are separate from private in-app publication and NOT_SENT external delivery. Approval stores a message version and source snapshot. Editing clears approval. Parents can create private conversations; assigned staff can respond and add internal notes. Parents never receive internal notes. General nutrition guidance requires academy-admin approval and explicit parent opt-in. Clinical recommendations are rejected; no diet generator exists.

Platform administrators manage customer metadata and local entitlement settings, not child records. An academy owner can grant a registered platform administrator a one-hour, single-player support review. This permits approved plans and reports only; messages, private working notes and dietary records stay hidden. Grants and reads are audited. `scripts/platform-admin.mjs` is an operator-only provisioning command; signup never grants platform administration automatically. Entitlement labels do not represent paid subscriptions.

Regional settings are validated with Intl. Fees store integer minor units and their own currency. Conversation timestamps use the academy time zone and locale. No combined cross-currency total is calculated. Local session scheduling, daylight-saving validation and conversion between measurement systems remain migration work; merely storing these settings does not implement those behaviours.

This is a local authenticated foundation, not approval to store real child data. See SECURITY_AND_DEPLOYMENT.md for deployment prerequisites and gaps.
