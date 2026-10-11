# Product

Football-only release. Multiple independent academies. Personalised player development. No rankings.

One application serves independent football academies with regional settings, authenticated owners/coaches/parents, individual plans, approved reports and linked-parent communication. Football is automatic, with no sport selector. Plans explain current focus → why selected → assigned drills → coach observations → review date → next step. Only recorded, reviewed drills and observations are shown. See FOOTBALL_ONLY_RELEASE.md and QA_REPORT.md for the customer boundary and remaining pilot blockers.

## Legacy fictional demonstration

Sportozen is an academy-first, youth-development operating system. The first configured sport is football. The core loop is PLAN → PERSONALISE → TRAIN → OBSERVE → REVIEW → ADAPT → REPORT → IMPROVE.

Owners configure the academy and monitor players, training, fees, attendance and review queues. Coaches create sessions, assign individual objectives, observe practice, review evidence and approve progress reports. Parents see a linked player's schedule, current priorities, path and reviewed updates.

The product communicates specific practice progress rather than a talent score. Evidence is labelled by provenance. Unmarked attendance is never absent; missing observations are never zero. Coach approval gates parent-facing evidence and reports.

The demo uses Stallions FC Academy, Coach Rahul and Aarav Sharma. Aarav's goal is scanning before receiving, with a 91% fictional historical attendance summary. His receiving pathway moves from stationary practice to moving practice. His reviewed evidence records four scanning actions in six observed attempts, and his report repeats that observation without generalising it into a ability claim.

All records are fictional. No real messages, money, media capture, AI analysis, predictive claims or medical claims are implemented. Demo users can switch roles freely. Parent filtering is a UI boundary and is tested; real security requires a backend.

## Report content and export

Player development reports explain practice, reviewed evidence and next steps without rankings or inferred improvement. Approved report records remain the source of truth. Optional live-plan data is not silently added to an approved report. Missing review dates are explicitly unconfirmed. See REPORTS.md.

## Authenticated multi-academy foundation

The authenticated customer entry is /workspace, with server-checked academy memberships, sport-specific plans, approved report snapshots and private parent messaging. Legacy role routes remain fictional demonstrations. See [MULTI_ACADEMY_FOUNDATION.md](MULTI_ACADEMY_FOUNDATION.md), [SECURITY_AND_DEPLOYMENT.md](SECURITY_AND_DEPLOYMENT.md) and [WORKSPACE_MIGRATION.md](WORKSPACE_MIGRATION.md) for the boundary, migration audit and remaining commercial requirements. External delivery remains NOT_SENT; no real messaging, billing or AI provider is connected.
