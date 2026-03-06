#!/bin/sh
set -e

echo "==> Running deploy:full steps..."

# Ensure the SQLite data directory exists (volume mount target)
mkdir -p /app/prisma/data

echo "  → Setting Prisma provider..."
npx tsx prisma/set-provider.ts

echo "  → Pushing database schema..."
npx prisma db push --skip-generate

echo "  → Seeding database..."
npx tsx prisma/seed.ts

echo "  → Seeding demo data..."
npx tsx prisma/seed-demo.ts

echo "==> Starting Next.js server..."
exec node server.js
