FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --filter=backend --production --no-save

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend/src ./src
COPY apps/backend/package.json ./
COPY apps/backend/tsconfig.json ./

EXPOSE 8000

CMD ["bun", "run", "src/index.ts"]
