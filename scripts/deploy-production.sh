#!/usr/bin/env bash
# --reset-data is a one-time, explicitly requested reset of the forsa database.
set -Eeuo pipefail
umask 077
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mode="${1:-}"
if [[ "$#" != 1 || ( "$mode" != --reset-data && "$mode" != --update ) ]]; then
  echo "Usage: bash scripts/deploy-production.sh --reset-data|--update" >&2
  exit 2
fi
[[ -f .env.production ]] || { echo 'Missing .env.production' >&2; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { echo 'Deploy from main only' >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo 'Tracked files have local changes; preserve them before deploying' >&2; exit 1; }
command -v flock >/dev/null
mkdir -p backups .deploy
exec 9>.deploy/deployment.lock
flock -n 9 || { echo 'Another deployment is active' >&2; exit 1; }
marker=.deploy/nayvo-v1.1-reset.done
if [[ "$mode" == --reset-data && -e "$marker" ]]; then
  echo 'Initial reset already completed. Use --update; data was not deleted again.' >&2
  exit 1
fi
compose=(docker compose --env-file .env.production -f docker-compose.prod.yml)
"${compose[@]}" config --quiet
stage=preflight
trap 'echo "Deployment stopped at: $stage. Keep backups and the rollback image; do not repeat the reset blindly." >&2' ERR
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="backups/nayvo-before-$timestamp.dump"
old_image=$("${compose[@]}" images -q app | head -n 1)
if [[ -n "$old_image" ]]; then
  docker image tag "$old_image" "nayvo-rollback:$timestamp"
fi
stage=build
# Finish the full native/web/server asset build before touching live data.
"${compose[@]}" build app
"${compose[@]}" up -d --wait db
db_name=$("${compose[@]}" exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT current_database()"')
[[ "$db_name" == forsa ]] || { echo 'Refusing reset/deploy: expected the dedicated forsa database' >&2; exit 1; }
# ADMIN_PASSWORD and SESSION_SECRET are required; RESEND_API_KEY only warns
# because the application runs without email and skips verification instead.
"${compose[@]}" run --rm --no-deps -T app node --input-type=module -e 'if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.startsWith("replace-with") || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.startsWith("replace-with")) throw new Error("Configure ADMIN_PASSWORD and SESSION_SECRET before deployment"); if (!process.env.RESEND_API_KEY) console.warn("WARNING: RESEND_API_KEY is not set. Email is disabled: registration skips verification and password reset is unavailable.")'
stage=backup
"${compose[@]}" stop app
"${compose[@]}" exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
test -s "$backup"
"${compose[@]}" exec -T db pg_restore --list < "$backup" > /dev/null
echo "Backup verified: $backup"
if [[ "$mode" == --reset-data ]]; then
  stage=reset
  # Both drop and schema creation are transactional: SQL failure rolls them back.
  {
    printf '%s\n' 'DROP SCHEMA public CASCADE;' 'CREATE SCHEMA public;'
    cat scripts/sql/nayvo-schema.sql
  } | "${compose[@]}" exec -T db sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction'
  printf '%s\n' "$(git rev-parse HEAD)" "$backup" "nayvo-rollback:$timestamp" > "$marker"
fi
stage=migrate
"${compose[@]}" exec -T db sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < scripts/sql/launch-hardening.sql
stage=start
"${compose[@]}" up -d app caddy
stage=health
"${compose[@]}" exec -T app node --input-type=module -e '
  let lastError;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      for (const path of ["/api/health", "/api/products", "/api/draws/current", "/", "/products", "/admin"]) {
        const response = await fetch("http://127.0.0.1:5000" + path, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error(path + ": " + response.status);
        if (path.startsWith("/api/")) await response.json();
        else if (!(await response.text()).includes("id=\"root\"")) throw new Error(path + ": missing web application");
      }
      console.log("Web, API and admin routes are ready");
      process.exit(0);
    } catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  throw lastError;
'
git rev-parse HEAD > .deploy/last-successful-commit
echo 'NAYVO deployment complete. Open https://nayvo.store and /admin/login.'
echo 'Add real products, a draw and payment details before releasing the mobile update.'
