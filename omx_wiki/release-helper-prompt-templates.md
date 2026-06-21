---
title: "Release-helper prompt templates"
tags: ["release", "routing", "templates", "codex", "workflow"]
created: 2026-06-21T04:43:25.904Z
updated: 2026-06-21T05:18:00.000Z
sources: []
links: ["repo-memory-index.md", "release-helper-routing.md"]
category: convention
confidence: medium
schemaVersion: 1
---

# Release-helper prompt templates

Use these templates when you want to invoke `release-helper` without remembering the full routing rules. See [release-helper-routing](release-helper-routing.md) for the workflow contract and mode behavior.

If you want the wiki home page first, start at [repo-memory-index](repo-memory-index.md).

## Quick templates

### Prepare

- `prepare release 2.1.0`
- `siapkan release 2.1.0`
- `release prep 2.1.0`

Use this when you want the release agent to prepare the version bump and changelog, but not merge or tag yet.

### Verify

- `verify release 2.1.0`
- `cek release 2.1.0`
- `release verify 2.1.0`

Use this when you want the release agent to validate the prepared release and run the release checks.

### Execute

- `execute release 2.1.0`
- `jalankan release 2.1.0`
- `release execute 2.1.0`

Use this when prepare and verify are already done and you want the final merge/tag/push steps only.

### Full release

- `full release 2.1.0`

Use this only when you explicitly want prepare -> verify -> execute in one run.

## Reminder

If you forget the flow entirely, open [release-helper-routing](release-helper-routing.md) first. If you remember the flow but not the wording, copy one template from this page.
