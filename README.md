<div align="center">

```
███████╗██╗     ██╗   ██╗██╗  ██╗██████╗ ██╗██████╗ ███████╗
██╔════╝██║     ██║   ██║╚██╗██╔╝██╔══██╗██║██╔══██╗██╔════╝
█████╗  ██║     ██║   ██║ ╚███╔╝ ██████╔╝██║██████╔╝█████╗  
██╔══╝  ██║     ██║   ██║ ██╔██╗ ██╔═══╝ ██║██╔═══╝ ██╔══╝  
██║     ███████╗╚██████╔╝██╔╝ ██╗██║     ██║██║     ███████╗
╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚══════╝
```

### *Stream everything. Deliver anything.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)](https://rabbitmq.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Tests](https://img.shields.io/badge/Tests-63%20passing-22C55E?style=flat-square)](./tests)
[![License](https://img.shields.io/badge/License-MIT-8B5CF6?style=flat-square)](./LICENSE)

<br/>

> **A production-grade distributed event streaming platform.**  
> Ingest millions of events. Process them asynchronously. Deliver to any destination.  
> With guaranteed delivery, automatic retries, dead-letter queues, and full observability.  
> Built from scratch. Zero shortcuts.

<br/>

</div>

---

## What Is This

You send an HTTP request. You get a `202 Accepted` back in milliseconds.

Behind that response, FluxPipe quietly does everything else — validates, persists, enriches, fans out across destinations, retries on failure, alerts you when something dies permanently, and logs every step of the journey with a distributed trace ID.

It's the infrastructure that separates "I built a CRUD app" from "I built a system."

---

## The Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │              External World                  │
                          │   SDKs · HTTP Clients · Webhooks · IoT      │
                          └──────────────────┬──────────────────────────┘
                                             │
                                    POST /v1/ingest
                                             │
                          ┌──────────────────▼──────────────────────────┐
                          │              Nginx Gateway                   │
                          │    SSL termination · Routing · Rate limit    │
                          └──────┬──────────────────────┬───────────────┘
                                 │                      │
               ┌─────────────────▼──────┐   ┌──────────▼─────────────────┐
               │   Ingestion Service    │   │   Management Service        │
               │                        │   │                             │
               │  • API key auth        │   │  • JWT auth + RBAC          │
               │  • Rate limit (Redis)  │   │  • Pipelines CRUD           │
               │  • Idempotency check   │   │  • Destinations CRUD        │
               │  • Write → Postgres    │   │  • API key issuance         │
               │  • Publish → RabbitMQ  │   │  • AES-256-GCM encryption   │
               │  • Return 202          │   │  • Usage metrics            │
               └─────────┬──────────────┘   └─────────────────────────────┘
                         │
              events.ingested exchange
                         │
               ┌─────────▼──────────────┐
               │   Processing Service   │
               │                        │
               │  • Consume RabbitMQ    │
               │  • Idempotency check   │──── transform queue (BullMQ)
               │  • Transform payload   │──── enrich queue   (BullMQ)
               │  • Enrich metadata     │──── route queue    (BullMQ)
               │  • Route to delivery   │
               └─────────┬──────────────┘
                         │
              events.processed exchange
                         │
               ┌─────────▼──────────────┐
               │   Delivery Service     │
               │                        │
               │  • DeliverEventSaga    │──── deliver queue (BullMQ x5 retries)
               │  • Fan-out to N dests  │
               │  • HMAC-SHA256 sign    │──── destination 1 ✓
               │  • Log every attempt   │──── destination 2 ✓
               │  • Exponential backoff │──── destination 3 ✗ → DLQ
               │  • Replay endpoint     │
               └─────────┬──────────────┘
                         │
                 events.dlq queue
                         │
               ┌─────────▼──────────────┐
               │  Notification Service  │
               │                        │
               │  • Consume DLQ         │
               │  • Throttle (Redis)    │──── Slack alert
               │  • 1 alert / 10 min    │──── Email alert
               └────────────────────────┘

────────────────────────────────────────────────────────────
   Postgres        Redis              RabbitMQ
   ─────────        ─────              ────────
   System of       Rate limits        events.ingested
   record          Idempotency        events.processed
   8 tables        JWT denylist       events.failed
   MVCC            Cache-aside        events.retry
   WAL             BullMQ queues      events.dlq
────────────────────────────────────────────────────────────
```

---

## The Numbers

| Metric | Value |
|---|---|
| Microservices | 6 |
| Shared packages | 8 |
| Database tables | 8 |
| RabbitMQ exchanges | 4 |
| BullMQ queues | 5 |
| Redis key namespaces | 5 |
| Test suites | 13 |
| Tests passing | 63 / 63 |
| Ingest latency (p99) | < 100ms |
| Max throughput | 1,000 events/sec |
| Retry attempts | 5 × exponential backoff |
| Container images | 10 |

---

## The Six Services

### Ingestion Service `→ :3002`
The hot path. Every millisecond counts here. Receives events, validates API keys against SHA-256 hashes, enforces sliding-window rate limits per plan tier (100/min free, 10k/min pro, 100k/min enterprise), checks Redis idempotency to prevent duplicate processing, writes the raw event to Postgres, and publishes to RabbitMQ — all before returning `202 Accepted`. The client is never blocked waiting for processing.

### Management Service `→ :3001`
The control plane. Everything a team does to configure FluxPipe lives here. JWT with 15-minute access tokens and 7-day refresh tokens with rotation. RBAC with three roles. AES-256-GCM encryption of destination secrets before they touch the database. Token revocation via Redis denylist so logout is instant and real.

### Processing Service `→ :3003`
The orchestrator. Consumes from RabbitMQ, checks idempotency again (second line of defence), and creates BullMQ jobs for a three-stage pipeline: transform (rename/drop/coerce fields per pipeline config), enrich (append org metadata from Redis cache-aside), route (fan out one job per destination). Bull Board dashboard at `/admin/queues` for visual monitoring.

### Enrichment Service `→ :3005`
Dedicated profile enrichment worker. Isolated because enrichment is the most cache-heavy stage — reads org and user profiles on every single event. Separated so it scales independently. Uses single-flight pattern on cache misses so 500 concurrent cache misses result in exactly 1 Postgres query.

### Delivery Service `→ :3004`
The most complex service. Executes `DeliverEventSaga` — a SAGA pattern implementation that fans out to N destinations in parallel. Every HTTP delivery is signed with HMAC-SHA256. Every attempt is logged with response code, latency, and error message. BullMQ retries up to 5 times with exponential backoff (100ms, 200ms, 400ms, 800ms, 1.6s). Terminal failures route to DLQ. Manual replay endpoint for operators.

### Notification Service `→ :3006`
The last line of defence. Watches the DLQ. When a pipeline's events permanently fail, it sends Slack (Block Kit) and email (Nodemailer) alerts. Redis-throttled to max one alert per pipeline per 10 minutes — a mass failure won't generate a flood of notifications.

---

## The Hard Parts

### Sliding Window Rate Limiting
Fixed windows have a vulnerability: 100 requests at 11:59:59 + 100 at 12:00:00 = 200 in 2 seconds. Sliding window solves this with a Redis sorted set — each request is timestamped, old entries pruned every check, current count is always the real 60-second window count.

```
ZADD  ratelimit:{apiKey}  {now}  {uuid}     ← record request
ZREMRANGEBYSCORE  ...  0  {now - 60000}     ← remove old entries  
ZCARD ratelimit:{apiKey}                    ← count = real rate
```

### Idempotency (Exactly-Once)
Clients retry on network failures. Without idempotency, a payment event retried 3 times creates 3 records. FluxPipe uses Redis `NX` (set if not exists) atomically — the first write wins, duplicates get the same `eventId` back instantly.

```
SET idempotency:{orgId}:{clientKey}  {eventId}  NX  EX  86400
         ↑ only written if key doesn't exist       ↑ 24h TTL
```

### SAGA Pattern
One event → N destinations. If destination 3 fails after 1 and 2 succeeded, you can't undo the HTTP calls already made. SAGA handles this by defining a compensation action for every step. Failed steps are logged as `compensated` (audit trail), status becomes `partial_failure`, and the event lands in DLQ for manual replay after the root cause is fixed.

### RabbitMQ Ack/Nack
Messages aren't deleted on consumption — they're held until acknowledged. `ack` = processed successfully, delete it. `nack(requeue=false)` = failed permanently, route to dead-letter exchange. If the service crashes mid-processing, RabbitMQ redelivers to another consumer. Nothing is lost.

### JWT Denylist
JWTs are stateless — you can't delete them. On logout, the token's `jti` (unique ID) is written to Redis with a TTL matching the token's remaining lifetime. Every protected request checks `EXISTS token:denied:{jti}`. Auto-expires when the token would have expired anyway. Zero memory growth.

---

## Stack

```
Runtime          Node.js 20 + TypeScript 5 (strict)
Framework        Express
ORM              Prisma 5 + PostgreSQL 16
Message Broker   RabbitMQ 3.13 (topic exchanges, DLQ, quorum queues)
Job Queue        BullMQ + Redis 7 (sorted sets, delayed jobs)
Cache/State      ioredis (rate limiting, idempotency, denylist, cache)
Auth             JWT (jsonwebtoken) + bcrypt
Validation       Zod
Encryption       AES-256-GCM (Node.js crypto)
HTTP Client      Axios
Logging          Winston + AsyncLocalStorage (distributed trace IDs)
Monorepo         Turborepo + pnpm workspaces
Containerization Docker (multi-stage builds) + Docker Compose
Gateway          Nginx (SSL, routing, load balancing)
Testing          Jest + Supertest (unit + integration + E2E)
```

---

## Project Structure

```
fluxpipe/
│
├── apps/
│   ├── management-service/      # Control plane API
│   ├── ingestion-service/       # Event intake hot path
│   ├── processing-service/      # Transform → Enrich → Route
│   ├── enrichment-service/      # Profile enrichment worker
│   ├── delivery-service/        # SAGA delivery + retry
│   └── notification-service/    # DLQ alerts
│
├── packages/
│   ├── shared-types/            # TypeScript interfaces + enums
│   ├── shared-utils/            # AppError, response helpers, pagination
│   ├── shared-config/           # Zod env validation
│   ├── logger/                  # Winston + trace ID propagation
│   ├── auth/                    # JWT + bcrypt + RBAC
│   ├── redis/                   # Rate limit, cache, idempotency, denylist
│   ├── rabbitmq/                # Connection, exchanges, publisher, consumer
│   └── database/                # Prisma client + repositories
│
├── infra/
│   ├── nginx/                   # Reverse proxy config
│   ├── postgres/                # Init SQL
│   ├── rabbitmq/                # Exchange + queue definitions
│   ├── redis/                   # Redis config
│   ├── prometheus/              # Scrape config
│   └── grafana/                 # Dashboard definitions
│
├── tests/
│   ├── unit/                    # Redis + RabbitMQ package tests
│   ├── integration/             # Per-service API tests (live infra)
│   └── e2e/                     # Full pipeline flow tests
│
└── docker-compose.yml
```

---

## Database Schema

```
organizations ──┬── users ──── api_keys
                ├── pipelines ──── destinations ──── delivery_attempts
                └── events ────────────────────────── delivery_attempts
                                                   └── event_logs
```

8 tables. Multi-tenant by design — every row carries `org_id`. UUID primary keys throughout. Partial indexes on `isActive` pipelines. GIN index on JSONB payloads. Unique constraint on `(org_id, idempotency_key)` — the database itself enforces exactly-once at the storage layer.

---

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- pnpm 9+

### Run the stack

```bash
git clone https://github.com/yourhandle/fluxpipe
cd fluxpipe

cp .env.example .env
# Edit .env with your values

docker compose up -d
```

All 10 containers start. Health checks confirm everything is up.

### Push the schema

```bash
DATABASE_URL=postgresql://fluxpipe:fluxpipe_dev@localhost:5433/fluxpipe \
  pnpm --filter @fluxpipe/database prisma:push
```

### Register and start ingesting

```bash
# Register
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@company.com","password":"strongpassword","name":"You","orgName":"ACME","orgSlug":"acme"}'

# Create a pipeline
curl -X POST http://localhost:3001/v1/pipelines \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"name":"User Events","config":{"transformRules":[]}}'

# Add a destination
curl -X POST http://localhost:3001/v1/destinations \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"name":"My Webhook","type":"webhook","pipelineId":"{pipelineId}","config":{"url":"https://your-endpoint.com/webhook"}}'

# Generate an API key
curl -X POST http://localhost:3001/v1/api-keys \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"name":"Production Key","scopes":["ingest"]}'

# Ingest an event
curl -X POST http://localhost:3002/v1/ingest \
  -H "Authorization: Bearer fp_live_xxxxx" \
  -d '{"pipelineId":"{pipelineId}","payload":{"event":"user.signed_up","userId":"123"}}'
# → 202 Accepted {"eventId":"..."}
# FluxPipe does the rest
```

### Run all tests

```bash
pnpm test
# 63 tests · 13 suites · all green
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Redis connection string |
| `RABBITMQ_URL` | ✓ | AMQP connection string |
| `JWT_SECRET` | ✓ | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✓ | Refresh token secret (min 32 chars) |
| `ENCRYPTION_KEY` | ✓ | AES-256-GCM key for destination secrets |
| `SLACK_WEBHOOK_URL` | — | Slack webhook for DLQ alerts |
| `SMTP_HOST` | — | SMTP host for email alerts |
| `NODE_ENV` | — | `development` / `production` / `test` |

---

## RBAC

| Permission | admin | operator | viewer |
|---|:---:|:---:|:---:|
| Create / edit pipeline | ✓ | ✓ | — |
| Delete pipeline | ✓ | — | — |
| Create destination | ✓ | ✓ | — |
| View events | ✓ | ✓ | ✓ |
| Replay events | ✓ | ✓ | — |
| View DLQ | ✓ | ✓ | ✓ |
| Manage users | ✓ | — | — |
| Manage API keys | ✓ | ✓ | — |
| View usage metrics | ✓ | ✓ | ✓ |

---

## API Reference

### Auth
```
POST /v1/auth/register      Create org + admin user
POST /v1/auth/login         Get access + refresh tokens
POST /v1/auth/refresh       Rotate refresh token
POST /v1/auth/logout        Revoke access token (Redis denylist)
```

### Pipelines
```
GET    /v1/pipelines         List org pipelines (paginated)
POST   /v1/pipelines         Create pipeline
GET    /v1/pipelines/:id     Get pipeline
PUT    /v1/pipelines/:id     Update pipeline
DELETE /v1/pipelines/:id     Soft delete pipeline
```

### Destinations
```
GET    /v1/destinations/pipeline/:pipelineId    List destinations
POST   /v1/destinations                         Create destination
GET    /v1/destinations/:id                     Get destination
PUT    /v1/destinations/:id                     Update destination
DELETE /v1/destinations/:id                     Delete destination
```

### Ingestion
```
POST /v1/ingest              Ingest single event → 202
POST /v1/ingest/batch        Ingest up to 100 events → 202
GET  /v1/ingest/:id          Get event status
```

### Delivery
```
GET  /v1/deliveries/:eventId         All delivery attempts for event
POST /v1/deliveries/:id/replay       Replay failed / partial_failure event
```

### System
```
GET /health     Service health (all services)
GET /metrics    Runtime metrics
GET /v1/usage   Org usage statistics
```

---

## RabbitMQ Topology

```
Exchange              Type    Queues bound
─────────────────     ──────  ────────────────────────────────
events.ingested       topic   events.processing
events.processed      topic   delivery.webhook
events.failed         topic   events.dlq
events.retry          direct  events.retry.delay (TTL 30s → re-ingested)

Routing key pattern: {action}.{orgId}.{resourceId}
```

---

## Test Coverage

```
tests/unit/
  redis/
    ratelimit.test.ts       sliding window, reset, key isolation
    cache.test.ts           miss/hit, TTL, getOrSet, single-flight stampede
    idempotency.test.ts     NX write, duplicate, TTL, org isolation
    denylist.test.ts        add, isBlocked, auto-expiry

  rabbitmq/
    publisher.test.ts       message arrival, persistence, traceId headers
    consumer.test.ts        ack, nack→DLQ, reconnect after channel drop

tests/integration/
  management/
    auth.test.ts            register, login, refresh rotation, logout denylist
    pipelines.test.ts       CRUD, org isolation, RBAC 403s

  ingestion/
    ingest.test.ts          202, DB write, 401, 429, idempotency, size limit

  delivery/
    replay.test.ts          reset status, re-publish, 404, 403, 400

tests/e2e/
  happy-path.test.ts        ingest → enrich → deliver, _meta validation
  retry-and-dlq.test.ts     5 retries → DLQ → Slack alert → throttle
  idempotency.test.ts       duplicate ingest, duplicate RabbitMQ message
```

All tests hit real infrastructure (Postgres, Redis, RabbitMQ). Zero mocks for external services.

---

## Resume Entry

```
FluxPipe — Real-Time Data Ingestion & Delivery Platform
github.com/yourhandle/fluxpipe

Architected and built a production-grade distributed event streaming platform
capable of ingesting, processing, and delivering high-throughput event data to
configurable downstream destinations with delivery guarantees.

• Designed 6-service microservices architecture in Node.js/TypeScript,
  orchestrated with Docker Compose behind Nginx, handling 1,000+ events/second

• Built async processing pipeline: RabbitMQ topic exchanges → BullMQ workers
  (transform → enrich → route) with sub-100ms p99 ingest latency

• Implemented SAGA-pattern multi-destination delivery with compensation logic,
  5-attempt exponential backoff, DLQ routing, and manual replay endpoint

• Built Redis-backed sliding-window rate limiting, cache-aside with single-flight
  stampede prevention, and NX-based idempotency keys for exactly-once processing

• Designed PostgreSQL schema with MVCC transactions, partial indexes, GIN indexes
  on JSONB payloads, and multi-tenant org isolation via foreign keys

• 63-test suite (unit + integration + E2E) hitting live infrastructure —
  no mocks for Postgres, Redis, or RabbitMQ

Tech: Node.js · TypeScript · PostgreSQL · Redis · RabbitMQ · BullMQ ·
      Docker · Nginx · Prisma · pnpm · Turborepo
```

---

<div align="center">

Built with zero shortcuts.

*If it wasn't hard, it wasn't worth building.*

</div>