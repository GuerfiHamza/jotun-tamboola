#!/usr/bin/env bash
# =====================================================================
# jotun-tamboola restore — restores a DB dump and/or uploads archive.
# Run from the project directory (where docker-compose.yml lives).
#
#   ./scripts/restore.sh --db      /var/backups/jotun/jotun-db-YYYYMMDD-HHMMSS.sql.gz
#   ./scripts/restore.sh --uploads /var/backups/jotun/jotun-uploads-YYYYMMDD-HHMMSS.tar.gz
#   ./scripts/restore.sh --db ...db.sql.gz --uploads ...uploads.tar.gz   (both)
#
# WARNING: restoring the DB OVERWRITES current data. You'll be asked to confirm.
# =====================================================================
set -euo pipefail

COMPOSE="${COMPOSE:-docker compose}"
DB_SERVICE="${DB_SERVICE:-db}"
APP_SERVICE="${APP_SERVICE:-app}"

DB_ARCHIVE=""
UP_ARCHIVE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)      DB_ARCHIVE="$2"; shift 2;;
    --uploads) UP_ARCHIVE="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$DB_ARCHIVE" && -z "$UP_ARCHIVE" ]]; then
  echo "Nothing to do. Pass --db <file> and/or --uploads <file>."; exit 1
fi

if [[ -f .env.local ]]; then set -a; source .env.local; set +a; fi
: "${DB_NAME:?DB_NAME not set (check .env.local)}"
DB_PASS_FOR_RESTORE="${DB_ROOT_PASSWORD:-${DB_PASS:?need DB_PASS or DB_ROOT_PASSWORD}}"
DB_USER_FOR_RESTORE="root"
[[ -n "${DB_ROOT_PASSWORD:-}" ]] || DB_USER_FOR_RESTORE="$DB_USER"

# --- DB restore ---
if [[ -n "$DB_ARCHIVE" ]]; then
  [[ -f "$DB_ARCHIVE" ]] || { echo "Not found: $DB_ARCHIVE"; exit 1; }
  echo "!! This will OVERWRITE the '$DB_NAME' database with: $DB_ARCHIVE"
  read -rp "Type 'yes' to continue: " ans
  [[ "$ans" == "yes" ]] || { echo "Aborted."; exit 1; }

  echo "[restore] loading database dump..."
  gunzip -c "$DB_ARCHIVE" | $COMPOSE exec -T "$DB_SERVICE" \
    mariadb -u "$DB_USER_FOR_RESTORE" -p"$DB_PASS_FOR_RESTORE" "$DB_NAME"
  echo "[restore]   database restored."
fi

# --- uploads restore ---
if [[ -n "$UP_ARCHIVE" ]]; then
  [[ -f "$UP_ARCHIVE" ]] || { echo "Not found: $UP_ARCHIVE"; exit 1; }
  echo "[restore] restoring invoice uploads (merges into existing files)..."
  # Extract into /app so the archive's 'private_uploads/' lands correctly.
  gunzip -c "$UP_ARCHIVE" | $COMPOSE exec -T "$APP_SERVICE" \
    sh -c 'mkdir -p /app/private_uploads && tar -xf - -C /app'
  echo "[restore]   uploads restored."
fi

echo "[restore] done. Consider: $COMPOSE restart app"