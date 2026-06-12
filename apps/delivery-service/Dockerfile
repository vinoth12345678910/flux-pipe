FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/delivery-service/ ./apps/delivery-service/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fluxpipe/delivery-service build
RUN pnpm deploy --filter @fluxpipe/delivery-service --prod /app/out

FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/out /app
USER appuser
EXPOSE 3004
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
