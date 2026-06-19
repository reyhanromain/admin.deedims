# Git Versioning Workflow

Deedims uses two long-lived branches and short-lived change branches. `main` is
the production baseline, while `dev` is the shared integration and testing
environment.

## Branch Roles

- `main`: production-ready code and the source of every new change branch.
- `dev`: integration branch for testing completed changes before production.
- `<type>/<short-description>`: one short-lived branch for one change. Keep this
  branch until it has been merged into both `dev` and `main`.

Never develop directly on `main` or `dev`. Do not merge `dev` into `main`,
because that can release other changes that have not finished testing.

Branch prefixes:

- `feat/` for user-facing features.
- `fix/` for bug fixes.
- `docs/` for documentation-only work.
- `test/` for test-only changes.
- `refactor/` for behavior-preserving code changes.
- `chore/` for maintenance, tooling, dependencies, and releases.
- `hotfix/` for urgent production fixes.

## Change Flow

1. Update `main`, then create a branch from it.

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/preorder-cancellation-report
```

2. Implement and verify the change, then push the branch.

```bash
git push -u origin feat/preorder-cancellation-report
```

3. Open a PR from the change branch to `dev`. Merge it with a **merge commit**.
   Do not squash, rebase-merge, or delete the branch yet. This preserves the
   exact tested commit for the production gate.

4. Test the integrated application on `dev`.

5. If testing passes, open a second PR from the same change branch directly to
   `main`. Merge it, then delete the change branch.

6. Synchronize `dev` after the production merge if GitHub reports branch
   divergence. Use a PR from `main` to `dev`; never rewrite either long-lived
   branch.

If a fix is required during `dev` testing, commit it to the same change branch,
merge that updated branch into `dev` again, and repeat testing. The PR to `main`
must contain the same final head commit already merged into `dev`.

The repository workflow validates these rules automatically:

- PRs to `dev` and `main` must come from a short-lived change branch.
- The change branch must contain the current `main` baseline before entering
  `dev`.
- The exact change-branch head must already exist in `dev` before it can enter
  `main`.

## Commits

Use Conventional Commits:

```text
<type>(optional-scope): <short imperative summary>
```

Accepted types are `feat`, `fix`, `docs`, `test`, `refactor`, and `chore`.

Examples:

```text
feat(preorders): add cancellation review filters
fix(upload): reject oversized menu images
docs(release): document version workflow
chore(release): v2.0.1
```

Keep commits scoped to one reason for change. Add a body when the reason or
migration impact is not obvious, and mark breaking changes with
`BREAKING CHANGE:` in the footer.

Optional local setup:

```bash
git config commit.template .gitmessage
```

## Pull Requests

Every PR must include:

- Target stage: integration into `dev` or production promotion into `main`.
- Summary of behavior or workflow changed.
- Verification commands and integration-test evidence.
- Schema, seed, environment, Docker, or deployment impacts.
- Screenshots for CMS UI changes.

Use merge commits for change branches entering `dev`. The final merge to
`main` may also use a merge commit so the same branch history remains visible.

## Versioning

Use one SemVer product version for the full monorepo because the backend, bot,
database, and frontend deploy together.

Version sources that must stay in sync:

- `VERSION`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `CHANGELOG.md`

SemVer bump rules:

- Patch: compatible bug fixes, security fixes, copy changes, and small
  operational fixes.
- Minor: backward-compatible features, new admin or bot flows, and additive API
  changes.
- Major: breaking API changes, destructive schema migrations, incompatible
  environment changes, or user-visible workflow replacements.

The current baseline is `2.0.0`.

## Release Flow

Prepare version and changelog changes on a `chore/release-X.Y.Z` branch created
from `main`, then follow the normal change flow through `dev` and `main`.

```bash
npm --prefix backend version X.Y.Z --no-git-tag-version
npm --prefix frontend version X.Y.Z --no-git-tag-version
```

After the release branch is merged into `main`, tag that merge commit:

```bash
git switch main
git pull --ff-only origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z
```

## Hotfix Flow

Create urgent fixes from `main` using `hotfix/<short-description>`. Verify them
on `dev` and promote the same branch to `main` unless the production incident
requires an explicitly approved emergency bypass.

## Required Verification Before Merge

Run the checks affected by the change at minimum. Run all checks for a release:

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run build && npm test
```
