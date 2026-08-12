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

# Image utilitas untuk membuat + memverifikasi backup prod. Dipakai lewat container
# supaya deploy tidak bergantung pada binary host (tar/sqlite3) yang belum tentu ada
# di mesin runner mana pun.
backup_image='alpine:3.22'

restart_backend_on_exit() {
  "${compose[@]}" start backend >/dev/null 2>&1 || true
}

# Operasi git ke remote diulang saat gagal. Egress deploy host pernah gagal
# menghubungi github.com selama 134 detik lalu menjatuhkan seluruh deploy —
# gangguan sesaat seperti itu tidak seharusnya perlu rerun manual.
#
# Tiap percobaan dibatasi `timeout` karena kegagalan yang pernah terjadi adalah
# connect timeout yang menggantung lebih dari dua menit; tanpa batas ini,
# mengulang justru memperpanjang deploy tanpa menambah peluang berhasil.
git_retries="${DEEDIMS_GIT_RETRIES:-3}"
git_timeout="${DEEDIMS_GIT_TIMEOUT:-60}"
git_retry_delay="${DEEDIMS_GIT_RETRY_DELAY:-10}"

retry_git() {
  local attempt=1 rc delay
  while true; do
    rc=0
    # Status 124 berarti dihentikan `timeout`, bukan penolakan dari git.
    timeout "$git_timeout" "$@" || rc=$?
    if (( rc == 0 )); then
      return 0
    fi
    if (( attempt >= git_retries )); then
      echo "Perintah git gagal setelah $attempt percobaan (status $rc): $*" >&2
      return "$rc"
    fi
    delay=$(( attempt * git_retry_delay ))
    echo "Percobaan $attempt gagal (status $rc); ulangi dalam ${delay}s: $*" >&2
    sleep "$delay"
    attempt=$(( attempt + 1 ))
  done
}

"${compose[@]}" config --quiet

retry_git git fetch origin "$expected_branch"
retry_git git pull --ff-only origin "$expected_branch"

echo 'Running backend verification...'
npm --prefix backend ci
npm --prefix backend run prisma:generate
test -s backend/node_modules/.prisma/client/default.d.ts
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

  # Tarik image sebelum backend dimatikan — kalau tidak, unduhannya terjadi saat
  # produksi sedang mati dan memperpanjang downtime.
  docker image inspect "$backup_image" >/dev/null 2>&1 || docker pull "$backup_image"

  echo "Stopping production backend for a consistent backup..."
  "${compose[@]}" stop backend
  trap restart_backend_on_exit EXIT

  docker run --rm \
    -v "$volume_name:/data:ro" \
    -v "$backup_dir:/backup" \
    "$backup_image" sh -c 'tar -czf /backup/data.tar.gz -C /data . && cp /data/app.db /backup/app.db'

  # Salinan sudah aman di disk; nyalakan backend lagi sebelum verifikasi agar produksi
  # tidak ikut menunggu langkah-langkah di bawah.
  "${compose[@]}" start backend
  trap - EXIT

  # Verifikasi di dalam container: `sqlite3` tidak dijamin terpasang di host runner.
  # `|| true` menjaga agar container yang gagal jatuh ke pesan di bawah, bukan ke
  # abort `set -e` tanpa keterangan.
  integrity="$(docker run --rm \
    -v "$backup_dir:/backup:ro" \
    "$backup_image" sh -c 'apk add --no-cache sqlite >/dev/null 2>&1 &&
      sqlite3 -batch -noheader /backup/app.db "PRAGMA integrity_check;"' \
    2>/dev/null | tail -1 | xargs || true)"
  if [[ "$integrity" != 'ok' ]]; then
    echo "Production database backup failed integrity check: ${integrity:-<verifikasi tidak menghasilkan output>}" >&2
    exit 1
  fi

  sha256sum "$backup_dir/data.tar.gz" "$backup_dir/app.db" > "$backup_dir/SHA256SUMS"
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
