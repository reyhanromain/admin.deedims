# Production and Staging Deployment

Deedims runs two isolated Docker Compose projects on one host:

| Environment | Branch | Hostname | Compose project | Data volume |
| --- | --- | --- | --- | --- |
| Production | `main` | `admin.deedims.biz.id` | `deedims-prod` | `deedims-prod-data` |
| Staging | `dev` | `dev-admin.deedims.biz.id` | `deedims-staging` | `deedims-staging-data` |

Each environment has a dedicated checkout, JWT secret, Telegram bot token,
SQLite database, uploads directory, Cloudflare tunnel, and loopback-only host
ports. Never reuse the production bot token or production data in staging.

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

## Controlled Deployment

Production must be checked out at `main`; staging must be checked out at `dev`.
The deployment script rejects any other branch or dirty checkout.

```bash
cd /home/reyhanr/apps/deedims-staging
./scripts/deploy.sh staging

cd /home/reyhanr/apps/deedims-prod
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
