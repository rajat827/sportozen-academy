# Football pilot readiness

Football-only release. Multiple independent academies. Personalised player development. No rankings.

The scope simplification retains authenticated academy/coach/guardian boundaries, regional configuration, individual plans, approved report snapshots and private parent messaging. It does not turn fictional training screens into authenticated customer features.

## Remaining essential blockers

1. **P1 — Authenticated football sessions and player-specific objectives are not implemented.** The customer repository has no session/personalisation record kind. Legacy `/coach/sessions` is a fictional browser demonstration.
2. **P1 — Authenticated attendance and structured training evidence/media are not implemented.** There is no secured customer attendance ledger, observation/evidence collection or media access route. Reports support explicit coach-entered observations, not an end-to-end reviewed session/evidence pipeline.
3. **P1 — The requested full training journey cannot pass.** Owner onboarding → coach assignment → plan → approved report → parent reply is supported; session personalisation → attendance/evidence must be completed before a full football training pilot can be called ready.

No other-sport work is needed to remove these blockers. Legacy demos remain separately tested and must not substitute for customer acceptance.

## Production prerequisites

Secure account ownership/recovery and staff MFA, verified guardian identity/consent procedures, durable managed persistence and backups, operational monitoring, retention/access audits, media controls and independent security review are still required before real children's data. Quiet-hour dispatch, daylight-saving session scheduling, units conversion and full localisation are not established by storing settings. SQLite local validation is not production approval. External providers remain disconnected and NOT_SENT.

See QA_REPORT.md for exact verification and QA_BUG_LOG.md for the scoped defect/blocker inventory.

All five configured quality gates pass (22 unit tests, 16 browser scenarios). The unchanged long demo PDF has an additional open P2 repeated header/footer visual issue. Automated green checks do not remove the essential authenticated training gaps above.

**NOT READY — BLOCKERS LISTED**
