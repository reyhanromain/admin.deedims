---
title: "Cloudflare credentials per domain"
tags: ["cloudflare", "credentials", "tunnel", "dns", "deedims", "deployment"]
created: 2026-06-19T06:44:57.682Z
updated: 2026-06-19T06:44:57.682Z
sources: []
links: []
category: decision
confidence: medium
schemaVersion: 1
---

# Cloudflare credentials per domain

Decision: keep Cloudflare management certificates explicitly named per zone. Use `~/.cloudflared/cert.deedims.pem` for `deedims.biz.id` and `~/.cloudflared/cert.reyhandita.pem` for `reyhandita.id`; do not rely on an ambiguous default `cert.pem`. Every management command must pass the matching `--origincert` path. A login certificate manages its authorized zone, while each running tunnel uses its separate `<tunnel-uuid>.json` runtime credential, so renaming or switching management certificates must not interrupt existing tunnels. Current follow-up: rename the newly issued Deedims `cert.pem` to `cert.deedims.pem` before the next Cloudflare management operation.
