# Frontend CI/CD

## Triggers and branch policy

- `develop`: integration branch; GitHub CI runs on every push and Vercel creates a Preview deployment.
- `main`: stable/release branch; GitHub CI runs on every push and Vercel creates the Production deployment.
- Pull requests target `main` and run CI.
- `workflow_dispatch` is available for an explicit manual run.
- The project intentionally has only `develop` and `main` as long-lived branches.

## GitHub Actions CI

The workflow uses Node 20 and `npm ci`, then runs ESLint, TypeScript, the repository's TypeScript unit-test files, and a real `next build`. It has read-only contents permission and cancels obsolete runs for the same ref.

There is no Vercel CLI deployment job. Vercel Git Integration is the single CD path.

## Vercel settings

Set Vercel `Production Branch` to `main`. Configure separate Preview and Production environment scopes. Do not place private backend secrets in `NEXT_PUBLIC_*` variables. The CI `NEXT_PUBLIC_API_URL` is a build-only localhost value; it is not a Vercel deployment setting.

Until the backend has a remotely reachable deployment, Preview/Production API integration remains pending; localhost cannot be reached by Vercel.

## Required GitHub rules

Protect `main` from force-push and deletion, require a pull request and the stable `Frontend CI / quality` check before merge. Keep direct pushes to `develop` available for the owner's integration workflow, while disabling force-push and deletion.

The local environment has no authenticated GitHub CLI, so configure this manually in repository Settings -> Rules -> Rulesets -> New branch ruleset. Target `main`, require a pull request and `Frontend CI / quality`, require the branch to be up to date, and disable deletion/force-push. Add a second ruleset for `develop` that disables deletion/force-push but allows direct pushes. Do not require an unavailable reviewer.
