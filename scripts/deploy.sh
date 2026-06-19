#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: $0 <prod|staging>" >&2
  exit 2
}

environment="${1:-}"
case "$environment" in
  prod)
    expected_branch='main'
    ;;
  staging)
    expected_branch='dev'
    ;;
  *)
    usage
    ;;
esac

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_root="${DEEDIMS_CONFIG_ROOT:-$HOME/.config/deedims}"
compose_env="$config_root/$environment.compose.env"
backup_root="${DEEDIMS_BACKUP_ROOT:-$HOME/backups/deedims}"

if [[ ! -f "$compose_env" ]]; then
  echo "Missing Compose environment file: $compose_env" >&2
  exit 1
fi

cd "$repo_root"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$expected_branch" ]]; then
  echo "Expected branch $expected_branch for $environment, found $current_branch" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Deployment checkout must have a clean working tree.' >&2
  exit 1
fi

compose=(docker compose --env-file "$compose_env")

restart_backend_on_exit() {
  "${compose[@]}" start backend >/dev/null 2>&1 || true
}

"${compose[@]}" config --quiet

git fetch origin "$expected_branch"
git pull --ff-only origin "$expected_branch"

echo 'Running backend verification...'
npm --prefix backend ci
npm --prefix backend run prisma:generate
npm --prefix backend run typecheck
npm --prefix backend test

echo 'Running frontend verification...'
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix frontend test

echo 'Building deployment images...'
"${compose[@]}" build

if [[ "$environment" == 'prod' ]] && "${compose[@]}" ps --services --status running | grep -qx backend; then
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="$backup_root/prod/$timestamp"
  volume_name="$("${compose[@]}" config --format json | jq -r '.volumes.app_data.name')"
  mkdir -p "$backup_dir"

  echo "Stopping production backend for a consistent backup..."
  "${compose[@]}" stop backend
  trap restart_backend_on_exit EXIT

  docker run --rm \
    -v "$volume_name:/data:ro" \
    -v "$backup_dir:/backup" \
    alpine:3.22 sh -c 'tar -czf /backup/data.tar.gz -C /data . && cp /data/app.db /backup/app.db'

  integrity="$(sqlite3 "$backup_dir/app.db" 'PRAGMA integrity_check;')"
  if [[ "$integrity" != 'ok' ]]; then
    echo "Production database backup failed integrity check: $integrity" >&2
    exit 1
  fi

  sha256sum "$backup_dir/data.tar.gz" "$backup_dir/app.db" > "$backup_dir/SHA256SUMS"
  trap - EXIT
fi

echo "Deploying $environment..."
"${compose[@]}" up -d --remove-orphans

backend_port="$("${compose[@]}" config --format json | jq -r '.services.backend.ports[0].published')"
frontend_port="$("${compose[@]}" config --format json | jq -r '.services.frontend.ports[0].published')"

for attempt in {1..30}; do
  if curl --fail --silent --show-error "http://127.0.0.1:$backend_port/health" >/dev/null \
    && curl --fail --silent --show-error "http://127.0.0.1:$frontend_port/" >/dev/null; then
    echo "$environment deployment is healthy."
    "${compose[@]}" ps
    exit 0
  fi
  sleep 2
done

echo "$environment deployment failed health verification." >&2
"${compose[@]}" ps >&2
"${compose[@]}" logs --tail=100 backend frontend cloudflared >&2
exit 1
