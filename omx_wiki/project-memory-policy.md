---
title: "Project memory policy"
tags: ["policy", "wiki", "docs", "memory", "deedims"]
created: 2026-06-21T05:10:15.634Z
updated: 2026-06-21T05:18:00.000Z
sources: []
links: ["repo-memory-index.md", "release-helper-routing.md", "release-helper-prompt-templates.md"]
category: convention
confidence: medium
schemaVersion: 1
---

# Project memory policy

Use this page as the rule of thumb for what belongs in the repo wiki, what belongs in docs, and what should stay local. This project is solo-maintained on this machine, so the wiki is primarily for future-you rather than a team handoff.

If you want the quickest entry point, start at [repo-memory-index](repo-memory-index.md).

## Put it in CHANGELOG.md when

- the change is user-facing
- the change ships with a versioned release
- the note should be part of the product release history

## Put it in repo docs when

- it is a stable project contract
- it explains how the codebase should be used or extended
- it is part of the implementation workflow that should stay close to the code

## Put it in the wiki when

- it is useful to remember later but not important enough for the changelog
- it is a decision, workflow, or pitfall that may be needed again after time passes
- it helps you resume work without rereading old chat logs

Examples:

- release workflow such as [release-helper-routing](release-helper-routing.md) and [release-helper-prompt-templates](release-helper-prompt-templates.md)
- branch contract and versioning contract
- deployment or operational decisions that are stable across sessions
- recurring pitfalls or recovery steps

## Keep it local, not in the wiki, when

- it is runtime-only state
- it is machine-specific configuration or credential data
- it is a temporary debug note
- it is only useful for the current session

## Simple test

Ask: "Will I probably want this again in two weeks?"

- If yes, put it in the wiki or docs.
- If no, keep it local.
- If it must ship with the release history, put it in the changelog.
