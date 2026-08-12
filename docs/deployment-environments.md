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

## Throttling

The two public unauthenticated POST endpoints are rate limited. Defaults ship in
`backend/src/config.ts`; override per environment in `<env>.backend.env` only if
you need to.

| Variable | Default | Applies to |
| --- | --- | --- |
| `LOGIN_RATE_MAX` | 5 | Failed logins per IP + username pair |
| `LOGIN_RATE_IP_MAX` | 20 | Failed logins per IP, all usernames |
| `LOGIN_RATE_WINDOW_MIN` | 15 | Window for both login counters |
| `MINIAPP_AUTH_RATE_MAX` | 30 | All `POST /api/miniapp/auth` requests per IP |
| `MINIAPP_AUTH_RATE_WINDOW_MIN` | 15 | Window for the mini app counter |

Only failed logins count and a successful login clears the pair counter, so
normal use never trips the limit. Counters live in memory and reset when the
backend restarts — that is the fastest way out if you ever lock yourself out.

This depends on nginx forwarding `CF-Connecting-IP`. If that header stops
arriving, every client collapses into one bucket and a single attacker can lock
out everyone. After changing anything in the proxy chain, verify from two
different networks that one being blocked does not block the other.

## Controlled Deployment

Production must be checked out at `main`; staging must be checked out at `dev`.
The deployment script rejects any other branch or dirty checkout.

```bash
cd ~/apps/deedims-staging
./scripts/deploy.sh staging

cd ~/apps/deedims-prod
./scripts/deploy.sh prod
```

Git operations against the remote are retried, because a transient egress
failure on the deploy host once took down a whole deploy: `git fetch` spent 134
seconds failing to reach github.com and the job exited before touching a
container. Each attempt is bounded by `timeout` — the failure mode is a hanging
connect, so without a bound retrying would only stretch the deploy out. Tunable
via `DEEDIMS_GIT_RETRIES` (3), `DEEDIMS_GIT_TIMEOUT` (60s per attempt), and
`DEEDIMS_GIT_RETRY_DELAY` (10s, multiplied by attempt number). This needs
`timeout` from coreutils on the deploy host.

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

## Moving an Environment to Another Host

Order matters. Stop the old host before starting the new one — a second
connector on the same tunnel splits traffic across two databases, and a second
backend on the same bot token fights over `getUpdates`.

1. Stop the Actions runner so no job can restart what you are about to shut
   down: `systemctl --user stop deedims-actions-runner`.
2. Prepare the new host without touching the live one: read-only deploy key,
   checkouts at `main` and `dev`, tunnel credential JSONs, the four runtime env
   files, `~/backups/deedims/prod`, and a `docker compose build` to warm the
   layer cache so the build is not inside the downtime window.
3. Take the stack down first, then snapshot — copying `app.db` while the backend
   is writing risks a torn snapshot:

   ```bash
   docker compose --env-file ~/.config/deedims/<env>.compose.env down
   docker run --rm -v deedims-<env>-data:/data:ro -v "$PWD:/backup" alpine:3.22 \
     tar -czf /backup/<env>-data.tar.gz -C /data .
   ```

4. Restore into a **new, empty** volume on the target host and verify before
   deploying: `PRAGMA integrity_check` must return `ok`, and the uploads file
   count and `app.db` byte size must match the source.
5. Run `./scripts/deploy.sh <env>` on the new host and let its health check pass.
6. Verify the tunnel registered from the new host, the bot logged `Bot @… aktif`
   with no repeated 409, and one uploaded image loads over the public hostname —
   that last one is what proves uploads came across, not just the database.
7. Move the runner last: register it on the new host with the exact labels
   `self-hosted,Linux,X64,deedims-deploy`, install the systemd **user** unit,
   `loginctl enable-linger`, then `./config.sh remove` on the old host. Two
   runners sharing the label means GitHub picks one at random.

Keep the old volumes until the new host has proven itself — they are the
rollback path.

## Rollback

For an application-only rollback, check out the last known-good commit in the
dedicated runtime checkout, rebuild, and redeploy. If a migration changed the
database incompatibly, stop production and restore both database and uploads
from the matching `data.tar.gz` snapshot before starting the previous image.
Verify `PRAGMA integrity_check`, `/health`, CMS login, and one uploaded image.
