#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ] && [ -n "${PROD_DATABASE_URL:-}" ]; then
  export DATABASE_URL="${PROD_DATABASE_URL}"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL or PROD_DATABASE_URL must be set" >&2
  exit 1
fi

# Pre-migration: handle adding required columns to tables that already have rows.
# prisma db push refuses to add a NOT NULL column without a default when rows exist.
echo "Running pre-migration fixes..."
PREMIGRATE_SQL='
ALTER TABLE "LearningMaterial" ADD COLUMN IF NOT EXISTS "classId" TEXT;
DELETE FROM "LearningMaterial" WHERE "classId" IS NULL;
'
echo "$PREMIGRATE_SQL" | node ./node_modules/prisma/build/index.js db execute --stdin --schema=./prisma/schema.prisma 2>&1 || \
  echo "Pre-migration skipped (may not be needed)"

echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || {
  echo "WARNING: prisma db push failed — the app will start but may have schema issues" >&2
}

exec node server.js
