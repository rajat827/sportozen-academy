# Sportozen Academy

A football academy portal for independent academies, coaches and parents. The application covers players, training batches, sessions, attendance, reviewed development reports, private parent communication and recorded academy fees.

## Start here

**The application code is saved on feature branches while review is in progress.** This `main` branch is the repository landing page; it does not yet contain the application. The branches have not been combined into one approved release.

- [Browse the saved application code](https://github.com/rajat827/sportozen-academy/tree/codex/simplify-player-form)
- [Full setup instructions and current development status](https://github.com/rajat827/sportozen-academy/blob/codex/simplify-player-form/README.md)
- [Open pull requests](https://github.com/rajat827/sportozen-academy/pulls)

## Saved work and reviews

| Area | Code | Review/status |
| --- | --- | --- |
| Player forms and latest saved project evidence | [Player branch](https://github.com/rajat827/sportozen-academy/tree/codex/simplify-player-form) | [Draft PR #13](https://github.com/rajat827/sportozen-academy/pull/13); latest CI passed, including browser checks |
| Quick Create Session | [Session branch](https://github.com/rajat827/sportozen-academy/tree/codex/simple-session-creation) | [Draft PR #14](https://github.com/rajat827/sportozen-academy/pull/14); work in progress |
| Configurable batch fee plans | [Fee Plans branch](https://github.com/rajat827/sportozen-academy/tree/codex/configurable-batch-fee-plans) | [Draft PR #15](https://github.com/rajat827/sportozen-academy/pull/15); backend work in progress, frontend integration remains incomplete |
| Approved Home preview | [Home branch](https://github.com/rajat827/sportozen-academy/tree/codex/home-screen-locked-ui) | [Draft PR #16](https://github.com/rajat827/sportozen-academy/pull/16); latest CI passed, visual approval remains separate |
| Monthly Report Review workspace | [Report Review branch](https://github.com/rajat827/sportozen-academy/tree/codex/monthly-report-review) | Saved work in progress; see its README for incomplete verification |
| Earlier Settings preview | [Settings branch](https://github.com/rajat827/sportozen-academy/tree/codex/settings-screen-locked-ui) | Preserved preview work; separate from the newer authenticated portal |

Draft PRs preserve reviewable work. Passing CI does not mean a feature is complete, visually approved, merged or deployed. Detailed limitations and evidence are recorded in each branch's README.

## Run the saved application locally

Use Node.js 24 and pnpm 11.19.0. Run these commands after cloning, selecting the application branch before installing:

```sh
git clone https://github.com/rajat827/sportozen-academy.git
cd sportozen-academy
git switch codex/simplify-player-form
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:3000/sign-in](http://127.0.0.1:3000/sign-in). Register an account to create a new empty academy, or sign in to an existing local academy database. Keep the development server running.

For port 3005 in PowerShell:

```powershell
$env:BETTER_AUTH_URL = "http://localhost:3005"
pnpm dev --port 3005
```

Then open [http://localhost:3005/sign-in](http://localhost:3005/sign-in). The configured authentication origin must match the browser host and port. Preserve any existing `SPORTOZEN_DATABASE_PATH` setting when reusing an academy.

The default database is ignored `.local/workspaces.sqlite`. Databases, account passwords, authentication secrets, `.env` files, dependencies and raw test traces are intentionally excluded from Git. A fresh clone does not include the local demonstration login accounts.

## Verification

On an application branch:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests use isolated fictional academies and guarded databases. Consult the application branch README for the matching QA build flags before running dedicated browser configurations. Existing customer databases must not be reset for testing.

## Product boundaries

Academy permissions and linked-child access are checked on the server. Batch training plans are the default; player personalisation is optional. Reports use recorded evidence and explicit coach review, with approval and parent publication kept separate. Missing evidence is not an invented score or improvement.

AI Video Analysis remains **Coming soon**. Online payment collection remains **Not Connected**. Live WhatsApp delivery requires separate authorised configuration and remains disabled by default. These saved branches do not establish a production deployment.

[Security and deployment requirements](https://github.com/rajat827/sportozen-academy/blob/codex/simplify-player-form/docs/SECURITY_AND_DEPLOYMENT.md)
