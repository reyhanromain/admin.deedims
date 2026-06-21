---
title: "Release-helper routing"
tags: ["release", "routing", "codex", "workflow", "deedims"]
created: 2026-06-21T04:37:02.251Z
updated: 2026-06-21T05:18:00.000Z
sources: []
links: ["repo-memory-index.md", "release-helper-prompt-templates.md"]
category: convention
confidence: medium
schemaVersion: 1
---

# Release-helper routing

Use this page when you forget how the release agent is meant to be invoked. The repo-local agent is `release-helper` in `.codex/agents/release-helper.toml`, and it is meant only for release workflow in this repository.

If you want the wiki home page first, start at [repo-memory-index](repo-memory-index.md).

## When to use it

Use `release-helper` after feature or fix work is already merged into `main` and you want to prepare or publish a repository release. Do not use it for ordinary feature implementation.

## Supported prompt modes

- `prepare release X.Y.Z`
- `verify release X.Y.Z`
- `execute release X.Y.Z`
- `full release X.Y.Z`

Natural-language aliases that route to the same agent:

- `siapkan release X.Y.Z`
- `cek release X.Y.Z`
- `jalankan release X.Y.Z`
- `release-helper`

## Behavior by mode

- `prepare` stops after version bumping, changelog update, and release branch setup.
- `verify` stops after release checks and readiness review.
- `execute` performs merge/tag/push finalization only.
- `full release` runs `prepare -> verify -> execute` in order, but only when explicitly requested.

## Release contract

The version sources that must stay in sync are:

- `VERSION`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `CHANGELOG.md`

Branch and tag rules:

- Create release branches from `main`.
- Merge the same tested release branch into `dev`, then into `main`.
- Tag the merge commit on `main` as `vX.Y.Z`.
- Never merge `dev` into `main`.

## How to find it again

Use `omx wiki wiki_query` with keywords like `release-helper`, `prepare release`, or `versioning workflow`, then open this page with `omx wiki wiki_read`.

If you only need the prompt wording, open [release-helper-prompt-templates](release-helper-prompt-templates.md).
