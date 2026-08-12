# Production and Staging Deployment

Deedims runs two isolated Docker Compose projects on one host — the NAS
(`nas-server`, user `claudeagent`), which also hosts the self-hosted GitHub
Actions runner labelled `deedims-deploy`:

| Environment | Branch | Hostname | Compose project | Data volume | Host ports |
| --- | --- | --- | --- | --- | --- |
| Production | `main` | `admin.deedims.biz.id` | `deedims-prod` | `deedims-prod-data` | 3100 / 8080 |
| Staging | `dev` | `dev-admin.deedims.biz.id` | `deedims-staging` | `deedims-staging-data` | 3101 / 8082 |

Each environment has a dedicated checkout, JWT secret, Telegram bot token,
SQLite database, uploads directory, Cloudflare tunnel, and loopback-only host
ports. Never reuse the production bot token or production data in staging.

Host ports are loopback-only debug handles — public traffic reaches the frontend
through the `cloudflared` container on the Compose network, so these values only
have to avoid collisions on the deploy host. Staging uses 8082 on the NAS
because 8081 is taken there by an unrelated service.

Only one host may run a given environment at a time. Two connectors on one
tunnel ID split traffic across two databases, and two backends sharing a bot
token fight over `getUpdates` (repeated 409s). Always stop the old host before
starting the new one.

## Runtime Files

Create these untracked files with mode `0600`:

```text
~/.config/deedims/prod.compose.env
~/.config/deedims/prod.backend.env
~/.config/deedims/staging.compose.env
~/.config/deedims/staging.backend.env
```

Use the examples in `deploy/`. The two Compose files point to their matching
backend env and Cloudflare credential files.

`CLOUDFLARED_USER` must match the owner of `CLOUDFLARED_CREDENTIALS_FILE`. The
credential JSON is mode 0600, so a mismatched UID leaves the tunnel unable to
read it and the container restarts in a loop. On the NAS the deploy user is
`claudeagent` (UID 1002), hence `CLOUDFLARED_USER=1002:1002`; the example files
keep the 1000:1000 default.

## Controlled Deployment

Production must be checked out at `main`; staging must be checked out at `dev`.
The deployment script rejects any other branch or dirty checkout.

```bash
cd ~/apps/deedims-staging
./scripts/deploy.sh staging

cd ~/apps/deedims-prod
./scripts/deploy.sh prod
```

The script pulls with fast-forward only, runs backend and frontend verification,
builds images, deploys the selected Compose project, and checks both HTTP health
endpoints. A production deployment also stops the backend briefly and creates a
consistent data snapshot under `~/backups/deedims/prod/` before rollout.

## Staging Initialization

Run the destructive seed only against a new staging volume:

```bash
docker compose --env-file ~/.config/deedims/staging.compose.env exec backend npm run seed
```

Never run `npm run seed` against production because it clears operational data.

## Cloudflare

Use the zone-specific management certificate for all management commands:

```bash
cloudflared tunnel --origincert ~/.cloudflared/cert.deedims.pem create deedims-admin-staging
cloudflared tunnel --origincert ~/.cloudflared/cert.deedims.pem route dns deedims-admin-staging dev-admin.deedims.biz.id
```

The generated tunnel credential JSON is mounted read-only into staging and is
never committed. Protect the staging hostname with Cloudflare Access before it
is shared with testers.

## Rollback

For an application-only rollback, check out the last known-good commit in the
dedicated runtime checkout, rebuild, and redeploy. If a migration changed the
database incompatibly, stop production and restore both database and uploads
from the matching `data.tar.gz` snapshot before starting the previous image.
Verify `PRAGMA integrity_check`, `/health`, CMS login, and one uploaded image.
