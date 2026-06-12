FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/enrichment-service/ ./apps/enrichment-service/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fluxpipe/enrichment-service build
RUN pnpm deploy --filter @fluxpipe/enrichment-service --prod /app/out

FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/out /app
USER appuser
EXPOSE 3005
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
