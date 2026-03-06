# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the application ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create a build-time .env (actual secrets are mounted at runtime, not baked in)
# set-provider.ts reads DB_PROVIDER from .env to configure prisma/schema.prisma
RUN echo 'DB_PROVIDER="sqlite"' > .env && \
    echo 'DATABASE_URL="file:./dev.db"' >> .env

# Generate Prisma client (uses sqlite provider from schema.prisma)
RUN npx prisma generate

# Build Next.js in standalone mode
RUN npm run _set-provider && npx next build

# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy the standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# package.json needed by tsx for module resolution during seeding
COPY --from=builder /app/package.json ./package.json

# Copy Prisma schema + seed files (needed at runtime for db:push & seeding)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy runtime deps needed for seeding (tsx, bcryptjs, uuid, etc.)
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/uuid ./node_modules/uuid
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild

# Copy the entrypoint script (path relative to build context = repo root)
COPY docker/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create the data directory for SQLite volume mount and set ownership
RUN mkdir -p /app/prisma/data && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
