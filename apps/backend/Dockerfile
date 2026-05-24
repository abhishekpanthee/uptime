FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY apps/backend/package.json ./
RUN bun install --production

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend/src ./src
COPY apps/backend/scripts ./scripts
COPY apps/backend/package.json ./
COPY apps/backend/tsconfig.json ./

EXPOSE 8000

CMD ["sh", "-c", "bun run scripts/migrate.ts && bun run src/index.ts"]
