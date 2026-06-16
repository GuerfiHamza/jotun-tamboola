#!/usr/bin/env bash
# =====================================================================
# jotun-tamboola backup — dumps the database and archives invoice files.
# Run from the project directory (where docker-compose.yml lives).
#
#   ./scripts/backup.sh
#
# Produces, in $BACKUP_DIR:
#   jotun-db-YYYYMMDD-HHMMSS.sql.gz       (logical mysqldump, gzipped)
#   jotun-uploads-YYYYMMDD-HHMMSS.tar.gz  (invoice files)
#
# Old backups beyond RETENTION_DAYS are pruned automatically.
# =====================================================================
set -euo pipefail

# --- config (override via environment) ---
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jotun}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="${COMPOSE:-docker compose}"
DB_SERVICE="${DB_SERVICE:-db}"
APP_SERVICE="${APP_SERVICE:-app}"

# Load DB creds from .env (DB_NAME, DB_USER, DB_PASS, DB_ROOT_PASSWORD)
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi
: "${DB_NAME:?DB_NAME not set (check .env)}"
DB_PASS_FOR_DUMP="${DB_ROOT_PASSWORD:-${DB_PASS:?need DB_PASS or DB_ROOT_PASSWORD}}"
DB_USER_FOR_DUMP="${DB_ROOT_PASSWORD:+root}"
DB_USER_FOR_DUMP="${DB_USER_FOR_DUMP:-${DB_USER}}"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[backup] $TS -> $BACKUP_DIR"

# --- 1. database dump ---
# --single-transaction = consistent snapshot without locking (InnoDB).
DB_FILE="$BACKUP_DIR/jotun-db-$TS.sql.gz"
echo "[backup] dumping database '$DB_NAME'..."
$COMPOSE exec -T "$DB_SERVICE" \
  mariadb-dump --single-transaction --quick --no-tablespaces \
  -u "$DB_USER_FOR_DUMP" -p"$DB_PASS_FOR_DUMP" "$DB_NAME" \
  | gzip > "$DB_FILE"
echo "[backup]   -> $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# --- 2. uploads archive ---
# Stream a tar of the invoice files straight out of the app container.
UP_FILE="$BACKUP_DIR/jotun-uploads-$TS.tar.gz"
echo "[backup] archiving invoice uploads..."
$COMPOSE exec -T "$APP_SERVICE" \
  tar -czf - -C /app private_uploads \
  > "$UP_FILE"
echo "[backup]   -> $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"

# --- 3. prune old backups ---
echo "[backup] pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name 'jotun-db-*.sql.gz'      -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'jotun-uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[backup] done."