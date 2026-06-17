# Git Versioning Workflow

Deedims uses a trunk-based Git flow with short-lived branches, Conventional Commits, and one SemVer product version for the full deployable app.

## Branches

- `main` is the only long-lived branch. It should always be deployable.
- Work happens in short-lived branches named `<type>/<short-description>`.
- Use release branches only when a version needs stabilization after feature work is frozen.

Branch prefixes:

- `feat/` for user-facing features.
- `fix/` for bug fixes.
- `docs/` for documentation-only work.
- `test/` for test-only changes.
- `refactor/` for behavior-preserving code changes.
- `chore/` for maintenance, tooling, dependencies, and releases.
- `release/` for release stabilization, for example `release/2.1.0`.
- `hotfix/` for urgent fixes from the current production tag.

Examples:

```bash
git switch main
git pull --ff-only
git switch -c feat/preorder-cancellation-report
```

## Commits

Use Conventional Commits:

```text
<type>(optional-scope): <short imperative summary>
```

Accepted types:

- `feat`: adds user-facing behavior.
- `fix`: corrects broken behavior.
- `docs`: documentation only.
- `test`: tests only.
- `refactor`: behavior-preserving code changes.
- `chore`: tooling, release, dependency, or maintenance work.

Examples:

```text
feat(preorders): add cancellation review filters
fix(upload): reject oversized menu images
docs(release): document version workflow
chore(release): v2.0.1
```

Commit rules:

- Keep commits reviewable and scoped to one reason for change.
- Do not mix schema changes, API changes, and UI changes unless the feature requires one atomic change.
- Add a body when the reason or migration impact is not obvious.
- Mark breaking changes with `BREAKING CHANGE:` in the footer.

Optional local setup:

```bash
git config commit.template .gitmessage
```

## Pull Requests

Every PR should include:

- Summary of behavior or workflow changed.
- Verification commands run.
- Schema, seed, environment, Docker, or deployment impacts.
- Screenshots for CMS UI changes.

Recommended PR merge style is squash merge. The squash title should be a valid Conventional Commit.

## Versioning

Use one product version for the full monorepo because the backend, bot, database, and frontend deploy together.

Version sources that must stay in sync:

- `VERSION`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `CHANGELOG.md`

SemVer bump rules:

- Patch: compatible bug fixes, security fixes, copy changes, small operational fixes.
- Minor: backward-compatible features, new admin workflows, new bot flows, additive API changes.
- Major: breaking API changes, destructive schema migrations, incompatible environment changes, or user-visible workflow replacements.

Pre-1.0 semantics are not used for this repository from this baseline onward. The current baseline is `2.0.0`.

## Release Flow

1. Start from a clean `main`.

```bash
git switch main
git pull --ff-only
```

2. Create the release branch.

```bash
git switch -c release/2.0.1
```

3. Update version files and changelog.

```bash
npm --prefix backend version 2.0.1 --no-git-tag-version
npm --prefix frontend version 2.0.1 --no-git-tag-version
printf '2.0.1\n' > VERSION
```

Add a new `CHANGELOG.md` section dated with the release date.

4. Run verification.

```bash
cd backend && npm run typecheck && npm test
cd ../frontend && npm run build && npm test
```

5. Commit the release branch.

```bash
git add VERSION CHANGELOG.md backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "chore(release): v2.0.1"
```

6. Open a PR from `release/2.0.1` to `main`. Merge only after verification passes.

7. Tag the merged commit on `main`.

```bash
git switch main
git pull --ff-only
git tag -a v2.0.1 -m "v2.0.1"
git push origin main v2.0.1
```

## Hotfix Flow

Use this only for urgent production fixes.

```bash
git switch main
git pull --ff-only
git switch -c hotfix/<short-description>
```

After the fix is verified, release it as a patch version using the release flow.

## Required Verification Before Merge

Run the checks affected by the change at minimum. For release branches, run all of them:

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run build && npm test
```
