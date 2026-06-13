FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY . .
RUN npx turbo@1.13.4 prune --scope=@fluxpipe/processing-service --docker

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /app

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY --from=pruner /app/out/full/ ./
COPY --from=pruner /app/tsconfig.base.json ./

RUN pnpm --filter @fluxpipe/database exec prisma generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY --from=builder /app /app

USER appuser
EXPOSE 3003
ENV NODE_ENV=production
CMD ["node", "apps/processing-service/dist/apps/processing-service/src/server.js"]

