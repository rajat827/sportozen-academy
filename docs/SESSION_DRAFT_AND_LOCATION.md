# Session drafts, football themes and optional location search

15 October 2026. Existing authenticated portal and academy services; no customer database reset.

## Confirmed Save Draft defect

The actual authenticated coach Training form was reproduced against the isolated production QA build. With an authorised batch, assigned coach, location, theme and valid start/end, Save stayed disabled if the academy had no curriculum drill. The UI checked `!agenda.length` and the server required `agenda.min(1)`. This made optional planning a prerequisite for saving a dated draft. See [before evidence](screenshots/final-academy/session-draft/before.json) and [actual browser](screenshots/final-academy/session-draft/before-minimum-1536.png).

Drafts now permit an empty agenda. Required squad, location, coach, theme and valid dated times are still checked by the shared browser/server input rules. Inline field messages identify missing/invalid values and focus the first error. Entered optional planning must remain internally consistent. Save retains the draft on failure and only closes after the server confirms persistence; the saved status remains DRAFT. The existing request receipt and synchronous mutation guard remain in place, with an additional form submission lock. Retries of the same request preserve one session and its attendance rows. Editing retains the session ID and optimistic version checks.

The browser regression covers required fields, minimum optional planning, end-before-start, failed transport retention, rapid clicks, refresh, a fresh login, editing, an existing academy venue and the manual fallback. Final browser retest is recorded by the final QA report; this document does not assert a pending run passed.

## Themes

Old academies receive twelve football suggestions without a database rewrite: ball control/first touch, passing/receiving, dribbling/turning, shooting/finishing, attacking, defending, positioning, decision-making, possession, small-sided games, coordination/movement and goalkeeping. Owner/Admin can configure 1–30 distinct suggestions in Settings → Sessions through the existing versioned academy configuration save. Each suggestion permits 200 characters. Coaches can always enter a Custom Theme, up to 2,000 characters, on the same session. Existing historical session themes and issued snapshots are preserved.

## Google Maps status and activation

The real provider is **CONFIGURATION_BLOCKED** in this environment. No Google Places request was sent and no billing account was provisioned. Choosing an existing academy venue and manually entering a training location remain fully usable, including the supplied scenario name Excelsior American School. No address, coordinates or Google Place identity is inferred from that name.

The adapter uses Places API (New) Autocomplete and Place Details, behind the authenticated same-origin academy endpoint. Search is explicitly requested by the user; it does not run on every keystroke. A unique UUID groups search refinements with the details selection. The response field masks request prediction IDs/text, then ID, display name, formatted address and required attributions. Google POI name/address and attribution text remain transient in the distinguished lookup container. They are never automatically copied into the saved session location, signed receipt, training history or request-receipt response. The academy enters its operational location independently using the existing manual field or academy venue. A signed 15-minute receipt binds the selected Place ID to that independent text, academy and user; changing the text clears the selection. Only the verified optional Place ID and independently entered operational text persist. No coordinates are requested or invented. There is no arbitrary URL proxy or raw provider-error forwarding.

The Places policy permits indefinite Place ID storage, but its narrow end-user street-address transaction exception does not generally permit retaining POI lookup content. The implementation therefore does not treat clicking Confirm as permission to store Google POI name/address. External deployment must still supply appropriate Terms/Privacy disclosures and review the applicable Google agreement before paid activation.

Server-only configuration, all required before live requests are possible:

| Variable                                  | Purpose                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `SPORTOZEN_GOOGLE_PLACES_ENABLED`         | Explicit `1` activation after paid-provider authorisation. Default is disabled even if a key exists. |
| `SPORTOZEN_GOOGLE_PLACES_API_KEY`         | Server secret for Places API (New); never `NEXT_PUBLIC_` or committed.                               |
| `SPORTOZEN_GOOGLE_PLACES_SIGNING_SECRET`  | Separate secret of at least 32 characters for selected-place receipts.                               |
| `SPORTOZEN_GOOGLE_PLACES_PER_USER_MINUTE` | Optional durable application cap, default 10, maximum 30 requests.                                   |
| `SPORTOZEN_GOOGLE_PLACES_PER_ACADEMY_DAY` | Optional durable academy cap, default 200, maximum 1,000 requests including selection details.       |

Restrict the server key to Places API (New) and permitted server egress IP addresses. The application only accepts its configured `BETTER_AUTH_URL` origin and currently authorised academy staff; a coach must be allowed to see the chosen batch. There is no browser-exposed Maps key or wildcard allowed-origin list. Configure Google project/API quotas, usage monitoring and billing limits separately before authorisation; application limits do not replace provider controls. Review the deployment's Maps terms, privacy disclosures, attribution and storage policy before enabling this integration. Changing an environment variable alone is not a claim that those external controls are configured.

Automated provider tests inject fake transport and explicitly synthetic place IDs/text. They cover valid/no results, invalid input, incomplete details, outage, same session UUID, signature tampering, expiry, user/academy scope, permissions, durable limits and selected-place save/reload. Browser UI mocks never persist a fabricated provider receipt; the real browser journey uses the configuration-blocked manual path.

Official guidance checked for this implementation:

- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Session tokens](https://developers.google.com/maps/documentation/places/web-service/using-session-tokens)
- [API security](https://developers.google.com/maps/api-security-best-practices)
- [Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
