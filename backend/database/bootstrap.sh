#!/bin/sh
# Fresh Docker volumes only. Existing installations use go run ./cmd/migrate.
set -eu
for file in /psi-migrations/*.sql; do
    name=$(basename "$file")
    checksum=$(sha256sum "$file" | cut -d ' ' -f 1)
    psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --single-transaction \
        -c 'CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())' \
        -f "$file" \
        -c "INSERT INTO schema_migrations(name,checksum) VALUES ('$name','$checksum')"
done
psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --single-transaction -f /psi-seed.sql
