# ── Build stage ──────────────────────────────────────
FROM oven/bun:1.2 AS build

WORKDIR /app

# Cache dependency layer
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# ── Production dependencies stage ────────────────────
FROM oven/bun:1.2 AS prod-deps

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── Production runtime ───────────────────────────────
FROM oven/bun:1.2-alpine AS production

WORKDIR /app

COPY --from=build /app/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER bun

CMD ["bun", ".output/server/index.mjs"]
