---
title: "Cloudflare credentials per domain"
tags: ["cloudflare", "credentials", "tunnel", "dns", "deedims", "deployment"]
created: 2026-06-19T06:44:57.682Z
updated: 2026-06-21T05:18:00.000Z
sources: []
links: ["repo-memory-index.md"]
category: decision
confidence: medium
schemaVersion: 1
---

# Cloudflare credentials per domain

Decision: keep Cloudflare management certificates explicitly named per zone. Use `~/.cloudflared/cert.deedims.pem` for `deedims.biz.id` and `~/.cloudflared/cert.reyhandita.pem` for `reyhandita.id`; do not rely on an ambiguous default `cert.pem`. Every management command must pass the matching `--origincert` path. A login certificate manages its authorized zone, while each running tunnel uses its separate `<tunnel-uuid>.json` runtime credential, so renaming or switching management certificates must not interrupt existing tunnels.

If you want the wiki home page first, start at [repo-memory-index](repo-memory-index.md).

Current state: the Deedims management certificate has been renamed to `cert.deedims.pem`. Production uses tunnel `b5311bc4-b39a-4da0-ab79-4520e838b45e` (`deedims-admin`), and staging uses tunnel `8ae4e2d0-2c36-4df0-97cb-6f781730c8c4` (`deedims-admin-staging`). The staging tunnel is active and `dev-admin.deedims.biz.id` is protected by the `Deedims Admin Staging` Cloudflare Access application, whose allow policy currently permits `reyhanromain@gmail.com`.
