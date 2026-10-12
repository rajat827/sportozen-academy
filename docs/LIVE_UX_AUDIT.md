# Sportozen Academy — live usability audit

Audit date: 12 October 2026 (Asia/Calcutta). AI-led role walkthrough; no real coach, child or parent participated. This is a **partial, read-only live audit**, not a successful authenticated end-to-end test or pilot-readiness sign-off.

## Environment, access and boundaries

- Tested normal entry: `http://127.0.0.1:3000/`. The running app is local and displays the Next.js development indicator.
- Landing explicitly offers fictional Owner, Coach and Parent demos without sign-in. The visible role selector contains those three roles and no Player option.
- No live build identifier was exposed in the inspected UI. Repository context: branch `codex/demo-first-entry`, HEAD `5f77fe25fe92eeff9a8eca80deea211fe4c2d0a4`. This does **not** establish the running build's provenance.
- Fictional public-demo views inspected: Stallions FC Academy; Coach Rahul; parent Neha Sharma and linked child Aarav Sharma. Kabir's existing personal objective was inspected in the coach view only.
- Coach and parent were opened in separate tabs of the same browser profile, **not separate authenticated sessions**. Demo-role navigation does not demonstrate authorization, academy isolation or parent-child access enforcement.
- Required access remains missing: existing authorized isolated synthetic customer academy; coach and parent authenticated sessions; confirmation that test writes cannot trigger external notifications. An access request was made and no confirmation was received during this audit. No passwords were requested in chat.
- No records were created, edited, approved, published, closed or sent. Attendance, counters, preferences and verification checkboxes were not changed. No database reset, build, deployment, source modification, external notification, payment, invitation or public sharing occurred.
- The UI says external delivery is `NOT_SENT` and no provider is connected. That is an observed interface statement, not an independent verification of transport configuration. It is insufficient authorization for write tests.
- Evidence is newly captured from this running application. No prior screenshots or previous automated test results are used as audit proof. App source was not inspected to substitute for missing live access.

## Method and effort accounting

Started at the landing page and followed visible links. Desktop viewport override: 1440 × 900. Phone browser emulation: 390 × 844 and 320 × 844; no physical-phone testing. Viewport overrides were reset at the end.

Counts below are observed successful UI actions on the stated path; they are not an optimized journey or total clicks to complete a blocked write workflow. Reading and scrolling are not clicks. No representative human timing or time-saving estimate is claimed. Requiredness of form fields was not submission-tested: presented controls are distinguished from mandatory fields.

One browser-control interruption prevented an initial attendance inspection; recovery succeeded. One semantic locator failed on Kabir's disclosure control; a fresh accessibility-tree click opened it. These are tooling limitations, not demonstrated app defects. A full-page screenshot failed; a viewport capture succeeded. Initial two 390px captures showed a scaled desktop layout before the viewport settled; they were replaced after observing the mobile layout. No failed capture is used as evidence.

### Actual navigation log

Coach: landing → **Coach demo** → Today → **Open Session Desk** → Training → **Attendance** → **Personalise** → expand Kabir → open mobile navigation → Tab → Escape → close navigation → **Today** → **View all** → Owner Sessions. This is nine successful clicks, including disclosure/drawer interactions, and two key presses. Returning via Today is one backtrack. The initial coach entry and session desk required two clicks; Attendance then Personalise added two.

Further coach inspection: select Coach in Demo role → Today → **Messages** → Communication centre → **Open conversation** → thread → **Back to Inbox** → **Review Update** on the existing pending card → **Close Review**. Six additional successful UI actions, including one role-selection gesture. No pending draft was created by this audit. No question from a parent was present in the inspected thread.

Parent: landing → **Parent demo** → Home → **View Plan** → Progress → mobile **Messages** → inbox → **Open Update and Reply** → thread → **More** → Profile → **Reports** → report → **Download PDF** → **Schedule**. Eight successful actions, including the download. At 320px a subsequent **Home** click opened the overlapping development-tools menu instead of navigating. After viewport restoration and dismissing that menu with Escape, desktop **Home** succeeded, followed by **View Plan** again for corrected 390px evidence. Thus 11 attempted actions in this parent inspection, 10 successful; one action was intercepted. Two separate tabs are not two authenticated accounts.

## Coach report

Conclusion: **Works but needs simplification**, for read-only fictional demo discovery only. The authenticated training-to-parent-update workflow is blocked by missing safe access, not proven broken or proven usable.

### Task outcomes

| Task | Outcome and actual path | Entry burden / clarity | Evidence and impact |
|---|---|---|---|
| Find today/next session | Completed discovery: landing → Coach demo (1 click) → Today | No entry. Prominent Open Session Desk is useful. Today is fixed to 7 October although audit date is 12 October. | 02; schedule relevance is unclear. |
| Inspect squad, drills, individual focuses | Completed discovery: Today → Desk (1 additional click) | Desk has U-13, four drill blocks and six individual focuses. Same session link was described differently on Today. | 02 plus live Desk observation; coach cannot trust carried-forward context. |
| Give two players different objectives in one session | Blocked write; existing objectives inspected via Attendance → Personalise and Kabir disclosure (2 navigation clicks plus 1 expand) | Aarav and Kabir have different objectives within one session. Six top-level focus inputs precede a second linked-objective section. For Aarav, seven presented controls span both sections, including two focus fields. Save objectives and Save Linked Objectives compete. Required field count unverified. | 05–07; repeated entry and uncertain saving boundary. |
| Mark attendance and record observation | Blocked write; Attendance tab inspected (1 click from Training) | Six players start Unmarked, with status and reason controls; bulk-present and Save attendance exist. Training has player selector, short observation textarea, optional-looking attempt/success counters; Save disabled while observation empty. No unrelated assessment was visibly required; successful recording untested. | 04 and live Training observation; short capture appears feasible but persistence unknown. |
| Review observation, choose next step, draft update | Blocked write; Messages opens Communication centre (1 click from Today) | Existing cards and manual draft composer are simultaneously present. Source review is discoverable, but no new observation/draft was made. | 19, 22; creation effort cannot be measured honestly. |
| Approve/publish isolated parent update | Blocked write/authentication; existing pending card's Review Update opened (1 click) | Ten verification checkboxes; Approve Update and Publish Approved Update In App initially disabled. Revision warning says editing clears approval/publication. No checkbox checked and no approval performed. | 22 and live source-review inspection; preserves fidelity, but functional gating remains untested. |
| Find/respond to parent question | Blocked: no authorized question created; existing thread opened (1 click from Communication centre) | Thread contains initial coach update, reply composer and separate staff-only notes. Coach Messages first opens draft management rather than a conversation list. No response posted. | 21; finding an incoming question requires competing communication concepts. |

### Findings, separated from recommendations

**C1 — session and role continuity.** Task: open the next session and see all sessions. Observed: Today says “Receive. Scan. Progress.”, Receiving & passing, three drills; its `s1` Desk says “Dribbling and Finishing” with four drills. Personalisation says Dribbling and Finishing while top rows say Passing & receiving. Current drill is Both-foot close-control touches with a body-shape/scanning/supporting-angles description. Today's View all navigates to `/owner/sessions` and the role visibly becomes Owner. Evidence: 02, 05, 09 and live Desk inspection. Impact interpretation: coaches may personalize the wrong context or lose confidence in the next-session shortcut. Proposed change: priority 1 below. This is observed public-demo inconsistency, not an authenticated privilege-escalation finding.

**C2 — duplicate editing paths.** Task: personalize Aarav and Kabir. Observed: top Individual focus and nested Linked focus duplicate the same wording, with two differently named save actions. Kabir's related-goal list contains two identical “Improve weak-foot passing” labels. Evidence: 05–07 and live expanded disclosure. Impact interpretation: uncertain which control/save owns the objective; identical options are hard to select deliberately. Proposed change: priority 2. Existing values were only read; synchronization or overwrite defects were not tested.

**C3 — competing communication workflows.** Task: locate questions and review a parent update. Observed: Messages starts on Development Updates with seven filters and an expanded manual-draft composer; the latter says approved drafts remain internal, while development-update cards say Published in app. Source review includes raw identifiers, a JSON-looking approved-report answer list, and a full previous message. Ten checks are visible. Evidence: 19, 22 and current accessibility-tree inspection. Impact interpretation: valid distinct publication rules require the coach to understand two communication models. Proposed change: priority 3, retaining all verification and publication safeguards.

What to preserve: direct Desk entry; one shared session with individual objectives; prefilled player/goal/drill relationships; Unmarked never means absent; short observation capture; explicit coach review and no automated analysis; distinct approval/publication/external delivery states. Smallest useful coach improvement: one objective editor with one clear save boundary, after authenticated flow validation.

## Player report

Conclusion: **Experience not implemented** in the inspected public entry and role navigation. Whether another authenticated permitted player view exists is **not established** because customer access was unavailable. No claim is made that all repository routes or deployed roles were exhaustively ruled out.

| Task | Outcome | Navigation / burden | Evidence and impact |
|---|---|---|---|
| Establish real Player role/view | Missing from inspected entry | Landing has Owner/Coach/Parent; role selector has only those three. No player mode selected or parent view relabelled. | 01 and live role selectors; independent player journey cannot be evaluated. |
| Current focus, reason, instructions/demonstration, cue | Missing permitted player entry; not tested as player | No independent player account or device assumed. | Role absence; no actual child comprehension findings. |
| Ask for help / difficulty feedback | Missing permitted player entry; not tested as player | No feedback created. | Cannot verify separation of player feedback and performance evidence. |
| Latest reviewed next step | Not tested as player | Parent-supported content exists, described below. | No independent learning-workflow conclusion. |

Parent-supported journey explicitly inspected: Neha can see Aarav's focus, why it was selected, four assigned drills, coaching cues and safe optional home practice on Progress. This could support supervised practice. It is still written for an adult: repeated evidence-method paragraphs and ACTIVE/INTRODUCED labels require interpretation. No demonstration or player-specific help affordance was observed on the parent plan; other drill/video surfaces were not exhaustively searched. Parent Message Coach offers an adult question route, not proof of a player's own feedback channel.

Interpretation requiring real-user validation: a concise supervised practice instruction may help younger players more than an adult record view. Do not infer that children found this easy or difficult. Proposed change: priority 4, initially clarify the parent-supported journey and postpone a separate child account unless the product requires it.

## Parent report

Conclusion: **Works but needs simplification**, for reading and navigation in the fictional demo. Authenticated privacy, question/response delivery, notification enforcement and refresh persistence remain blocked or untested.

| Task | Outcome and path | Entry burden / clarity | Evidence and impact |
|---|---|---|---|
| Find current focus and why | Completed reading: landing → Parent demo (1 click) → Home | Identity Aarav/Neha/academy clear. Focus, explanation and planned drills visible without opening a retrospective report. | 10, 20; strong initial orientation. |
| Understand planned activities vs reviewed progress | Completed inspection: Home → View Plan (1 click) → Progress | Planned drills separate from Approved evidence. Purpose/cues/observation/evidence method repeat across four drills. ACTIVE, INTRODUCED, On Track and Developing coexist. Meaning of On Track was not explained in inspected view. | 11–12; dense content and overlapping states can obscure the practical instruction. |
| Latest approved observation / next development step | Completed reading | Home labels Coach Observation and reviewed practice; Progress has Coach Reviewed evidence and next goal. Review date 21 October shown on plan. | 10–12; evidence uncertainty is stated instead of ranking the child. |
| Open/download report | Completed: Progress → Messages → thread → More → Reports, then Download PDF. Four navigation clicks from Progress plus download; this was the actual exploratory route, not shortest possible. Home also exposes a report link. | Report is distinct from plan: current focus, practiced work, reviewed observation, next step and closing note. No form entry. | 16–17 and actual downloaded PDF; export works. |
| Ask question/read response | Blocked write; Messages → Open Update and Reply (1 click from inbox) | Existing thread and Reply textarea shown; Reply In App disabled while empty. General conversation topic + question controls also exist in inbox. No question sent, no response generated/read. | 13–14; compose affordance exists, full round-trip unknown. |
| Next session | Completed reading: report → Schedule (1 click) | Schedule lists 7 and 8 October; Home labels 7 October “Next training” on audit date 12 October. No future session observed. | 18 and Home; stale demo chronology can mislead scheduling. |
| Relevant preferences | Completed inspection: thread → More (1 click) | Thirteen category checkboxes, notification toggle, language, quiet-hour start/end, disabled future external toggle and dietary-note textarea. Nutrition unchecked; Save Parent Preferences visible. Requiredness and enforcement not tested. | 15 plus live Profile inspection; safe guidance but a long settings form. |
| Parent-child/staff-note exclusion | UI-only inspection completed; authorization test blocked | Parent inspected pages show Aarav, not another child. Staff note controls and activity/restricted-information section exist on Coach thread and are absent from Parent thread. No private note was created. | 14, 21; positive rendering separation, not a security test. |

**P1 — parent-friendly communication.** Task: read the published update. Observed: parent inbox/thread show APPROVED, PUBLISHED, NOT_SENT, INTRODUCED, record IDs `s1-p1`, `s2-p1`, `e1`, `o1`, “Unmarked · No reason recorded”, and the same coach observation criterion four times. The cards honestly distinguish in-app publication from external delivery; no fake external Delivered/Sent state was observed. Evidence: 13–14 and live inbox text. Impact interpretation: a parent who can already read a message may interpret NOT_SENT as failure and unmarked attendance as a concern; raw IDs add no immediate practice instruction. Proposed change: priority 3. This is clarity friction, not evidence of external delivery or inaccurate negative scoring.

**P2 — plan/report date and status agreement.** Task: determine next review and next session. Observed: plan and approved update say 21 October; report HTML and actual PDF say “Review date to be confirmed.” Home says 91% recorded attendance while source snippets list two Unmarked sessions; population/time-window for that percentage is not explained in inspected views, so it is not established as numerically wrong. Review/plan states and On Track are not explained together. Evidence: 10–18. Impact interpretation: unclear whether the report is a historical snapshot or current plan and when the next review really occurs. Proposed change: priority 1. Preserve snapshot immutability; show its date/version and clarify whether a current-plan review date differs.

### Actual PDF inspection

Downloaded from visible Parent Reports → Download PDF during this audit, retained as `parent-report-live.pdf`. One page, rendered as 17-report-export-1.png and visually inspected. Academy, Aarav, football/U-13/coach, current focus, observation of three of six introductory attempts, evidence uncertainty, next step, closing note and private-demo footer are legible. No visible clipping, table collisions, extra blank page or missing footer. Export agrees with the report screen on focus, observation, next step and the unconfirmed review date. The date conflict is with the current plan, not between HTML and PDF. Poppler emitted fallback-font warnings; rendered text remained readable. One sample does not validate long-report pagination or every export.

### Mobile and accessibility inspection

| View / test | Observed result | Scope |
|---|---|---|
| Coach Personalise, 390/320 emulation | Cards stack; long objective/goal/evidence-method values are clipped inside single-line fields. At 320: innerWidth 320, document scrollWidth 305 (vertical scrollbar consumes space). | No page-wide horizontal overflow measured on this view; full values not readable at a glance. 06–07. |
| Coach drawer keyboard, 320 | Open navigation succeeds. Focus initially remains on background Open navigation; Tab goes to background Demo role. Escape leaves drawer open. Close navigation succeeds. | Actual key test, not an inferred focus issue. 08 plus live focused AX states. |
| Parent Progress, 390/320 | Focus/why/drill content wraps; bottom nav visible. At 390: scrollWidth 375; at 320: 305. Repetition produces lengthy vertical scrolling. | No horizontal overflow measured on inspected view; not every route certified. 11–12. |
| Parent inbox, 320 | Message wraps in one column; document scrollWidth 305 at width 320. Long initial message pushes conversation entry/reply paths below several screens of content. | No exact swipe count or human timing measured. 13. |
| Parent Home, 390 | Clear identity/focus in mobile cards and persistent bottom navigation. | Browser emulation; corrected settled capture 20. |
| Parent bottom Home, 320 local dev | Home click opened Next.js Dev Tools menu instead of navigation; Escape dismissed it and Home succeeded at desktop width. Development indicator visibly overlaps the Home touch area. | Local development-tool overlay issue, not proof of a production defect. 12–16 show indicator overlap; menu-opening observed in live AX. |
| Report/profile/thread at 320 | Viewport captures obtained; navigated to report, preferences and thread. | Did not exhaustively measure focus, contrast, every tap target, all controls or dialog behavior. No physical keyboard/phone user study. |

No source fix was made. Screenshots are viewport captures except the rendered complete PDF page. Important offscreen source-review checklist details are recorded as live UI observations rather than pretending screenshot 22 contains the entire checklist.

## Consolidated UI/UX conclusion

| Category | Observed findings | Practical scope |
|---|---|---|
| Functional defects | Coach View all changes demo role; mobile drawer allows background keyboard focus and does not dismiss with Escape; local dev indicator intercepts bottom Home. | Reproduced in live demo. No authenticated write or backend failure established. |
| Workflow friction | Duplicate objective inputs/two save actions; Messages starts in updates rather than question list; separate expanded manual draft workflow; repetitive parent plan/message. | Read-only observations; saving and full update click budget remain unknown. |
| Unclear content/terminology | Session title/focus/drill-count mismatch; fixed Today/Next dates; duplicate goal labels; internal status/record IDs; plan review date vs snapshot report ambiguity; unexplained On Track alongside other progress states. | Content fidelity and clarity, not claims of ranking, invented progress or numerical corruption. |
| Missing user journeys | No visible Player entry/role; isolated authenticated coach-parent audit setup not available. | Independent player and actual customer workflows cannot be certified. |
| Visual/accessibility | Mobile single-line fields hide meaningful values; drawer focus/Escape behavior; long repeated copy increases scrolling; development-only bottom-navigation obstruction. | 1440/390/320 browser emulation only. |

No leaderboard, talent score, comparison between children or public profile was observed in inspected surfaces. Multi-academy isolation was **not tested** with authorized authenticated accounts. Approval UI and private-parent rendering are promising safeguards; their presence does not prove secure enforcement.

### Only the five highest-impact changes recommended

1. **Preserve session, role and time context end to end.** Task → coach opens next session / parent checks next review. Observed → inconsistent session/drill details, Owner switch, stale “next” dates and plan/report date ambiguity. Evidence → 02, 05, 09, 10, 16–18. Impact → user may act on the wrong training context. Change → carry one session identity through role-appropriate navigation, clearly label the fictional reference date, and distinguish dated report snapshots from the current plan. Preserve honest reviewed evidence and immutable approved snapshots; do not silently rewrite history.
2. **Simplify personalisation to one objective editor and save boundary.** Task → two players, different goals, one session. Observed → repeated focus fields, two saves, indistinguishable goal labels. Evidence → 05–07. Impact → excess interpretation and possible repeated typing. Change → one player row/detail editor with recognizable goal labels, inherited drill/cue/evidence defaults and one save action. Preserve individual goals and explicit coach review; postpone extra assessment fields until required by the actual task.
3. **Make parent updates readable and coach questions easy to find.** Task → parent understands plan/replies; coach locates questions. Observed → raw IDs/status enums/repeated paragraphs, two adjacent communication models, Messages starts on drafts. Evidence → 13–14, 19, 21–22. Impact → internal workflow crowds out the purpose and response. Change → concise plan/practised/observed/next-step message, plain-language in-app status, raw sources/audit details in secondary views, explicit separation of manual drafts and publishable updates, and a prominent conversation/unread entry. Preserve all source-verification, approval and NOT_SENT data; do not remove checks to reduce clicks.
4. **Define a supported player practice journey before adding a child account.** Task → player knows what to practise and asks for help. Observed → no permitted player entry; adult parent plan contains useful cues but dense evidence administration. Evidence → 01, 11–12 and live role options. Impact → independent player learning path is absent from tested entry. Change → first make parent-supported practice explicit with one activity/cue and guardian-assisted question path. Move technical evidence detail secondary. Postpone a new independent child role until its age, consent and access needs are validated with real users; do not rename the parent dashboard Player mode.
5. **Repair mobile keyboard/navigation readability.** Task → use objectives/navigation at phone widths. Observed → clipped one-line values; drawer focus behind overlay and no Escape dismissal; local dev badge blocks Home. Evidence → 06–08, 12–16. Impact → important context is hidden and keyboard users can leave the apparent navigation surface. Change → wrap/read full objective values, manage drawer focus/Escape/restoration and keep local demo navigation unobscured. Preserve bottom navigation and stacked cards; verify production separately before attributing the development badge problem to it.

### Role conclusions and one focused next task

- Coach: **Works but needs simplification** in the inspected read-only demo. Authenticated creation, attendance, review, approval/publication and response are blocked by missing authorized isolated access.
- Player: **Experience not implemented** in inspected visible entry/roles. An authenticated alternative remains unverified; parent-supported reading is not an independent player account.
- Parent: **Works but needs simplification** for demo reading, navigation and the actual PDF download. Authenticated child isolation, private-note enforcement, reply/response, preferences and refresh persistence were not established.

**Focused next task: enable and execute an isolated authenticated coach-to-parent audit run.** Provide an existing authorized synthetic academy, separate coach and parent sign-ins through the browser, and verified external-notification disablement. Then repeat one session with two objectives → attendance/one genuine test observation → review/next step → draft/source verification → approval/private in-app publication → parent question/coach reply → refresh/privacy checks. Use visible UI, record actual burden and stop for review before implementing the five changes. This prerequisite is not a request to remove authentication or to create/reset customer data.

### Evidence inventory

All files are under [screenshots/live-ux-audit/](screenshots/live-ux-audit/). Names refer to fictional records only; no credentials or real contact details are included.

| File | Fresh live evidence |
|---|---|
| 01-landing-1440.jpg | Normal entry and three demo roles |
| 02-coach-today-1440.jpg | Today session card/date/context |
| 04-coach-attendance-1440.jpg | Unmarked attendance controls |
| 05-coach-personalise-1440.jpg | Shared session personalisation |
| 06-coach-personalise-390.jpg / 07-coach-personalise-320.jpg | Phone objective readability |
| 08-coach-drawer-keyboard-320.jpg | Drawer state during keyboard test |
| 09-coach-link-owner-role-1440.jpg | Actual Owner role after Coach View all |
| 10-parent-home-1440.jpg / 20-parent-home-390.jpg | Parent identity and planned focus |
| 11-parent-plan-390.jpg / 12-parent-plan-320.jpg | Settled mobile plan layout |
| 13-parent-inbox-320.jpg / 14-parent-thread-320.jpg | Parent message and thread |
| 15-parent-preferences-320.jpg | Visible preference controls |
| 16-parent-report-320.jpg | Live report HTML |
| parent-report-live.pdf / 17-report-export-1.png | Actual download and complete rendered page |
| 18-parent-schedule-320.jpg | Existing dated sessions/objectives |
| 19-coach-communication-1440.jpg | Updates and communication entry |
| 21-coach-thread-1440.jpg | Staff thread; internal notes observed lower down |
| 22-source-review-1440.jpg | Open pending source-review section |

There is intentionally no file 03: the interrupted capture did not produce evidence. No completed publication/reply screenshot is claimed. Existing unrelated `docs/screenshots/qa-communication-phone.png` was preserved and is not audit evidence.

Stopping point: audit artifacts only. No fixes, redesign, deployment, app build or automated write tests were run. Existing application tests are not represented as live usability validation.

## Follow-up implementation and retest

The subsequent five-priority fix round is recorded separately in [UX_SIMPLIFICATION_RESULTS.md](UX_SIMPLIFICATION_RESULTS.md). The earlier findings and blocked authenticated tasks above remain historical results. Follow-up source inspection identified that opening a demo conversation can automatically mark its existing message read; the earlier read-only boundary meant no deliberate form submissions, not a guarantee of zero incidental read acknowledgements. No approval, message posting or customer authentication was inferred from those acknowledgements.
