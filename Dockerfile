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
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER bun

CMD ["bun", ".output/server/index.mjs"]
