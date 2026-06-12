
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/FluxPipe-v1.0-6C47FF?style=for-the-badge&labelColor=1a1a2e">
  <img alt="FluxPipe" src="https://img.shields.io/badge/FluxPipe-v1.0-6C47FF?style=for-the-badge&labelColor=f0f0ff">
</picture>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node->=20-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9-F69220?style=flat-square&logo=pnpm&logoColor=white">
  <img alt="Turborepo" src="https://img.shields.io/badge/Turborepo-1.13-EF4444?style=flat-square&logo=turborepo&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.19-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5.14-2D3748?style=flat-square&logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white">
  <img alt="RabbitMQ" src="https://img.shields.io/badge/RabbitMQ-3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white">
  <img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white">
</p>

<p align="center">
  An event-driven microservice pipeline for ingesting, transforming, enriching, and delivering events at scale.
</p>

<p align="center">
  <a href="#architecture">Architecture</a> •
  <a href="#services">Services</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#api">API</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Architecture

FluxPipe is a **6-service event processing pipeline** that ingests HTTP events, transforms them through configurable pipelines, enriches them with profile data, delivers them to destinations, and alerts on failures — all connected through RabbitMQ with Redis for caching, rate limiting, and idempotency.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    External Clients                      │
                    └────────────────┬────────────────────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Management API     │  ───  JWT + RBAC
                          │     (port 3001)      │        admin: pipelines,
                          └──────────────────────┘        destinations, keys
                                     │
                          ┌──────────▼──────────┐
          API Key Auth ──►│   Ingestion Service  │  ◄── HTTP POST /v1/ingest
          Rate Limit      │     (port 3002)      │      sliding window
          Idempotency     └──────────┬───────────┘
                                     │ RabbitMQ: events.ingested
                          ┌──────────▼──────────┐
                          │  Processing Service  │  ◄── BullMQ workers:
                          │     (port 3003)      │      transform → enrich → route
                          └──────────┬───────────┘
                                     │ RabbitMQ: events.processed
                          ┌──────────▼──────────┐
                          │   Delivery Service   │  ◄── Webhook delivery
                          │     (port 3004)      │      replay + retry
                          └──────────┬───────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                 │
         ┌──────────▼──────────┐    │     ┌───────────▼───────────┐
         │ Enrichment Service   │    │     │  Notification Service │
         │    (port 3005)       │    │     │     (port 3006)       │
         │ profile + cache     │    │     │  email + Slack alert  │
         └─────────────────────┘    │     └───────────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │       Event Bus (RabbitMQ)      │
                    │  ┌──────┬──────────┬────────┐  │
                    │  │ DLQ  │  Retry   │ Failed │  │
                    │  └──────┴──────────┴────────┘  │
                    └────────────────────────────────┘
```

### Data Flow

```
HTTP Event ──► Ingestion ──► RabbitMQ ──► Processing ──► RabbitMQ ──► Delivery ──► Destination
                    │                          │                            │
                    │                          │                            ├── Success → EventLog
                    ▼                          ▼                            └── Failure ──► RabbitMQ Failed
               Redis (idempotency)        Postgres (status)                              │
                                                                                         ▼
                                                                                   Notification
                                                                                  (email/Slack)
```

---

## Services

| Service | Port | Role | Auth | Dependencies |
|---|---|---|---|---|
| **Management** | 3001 | Admin API & control plane | JWT + RBAC | Postgres, Redis |
| **Ingestion** | 3002 | HTTP event intake | API Key | Postgres, Redis, RabbitMQ |
| **Processing** | 3003 | Event transformation pipeline | Internal | Postgres, Redis, RabbitMQ |
| **Delivery** | 3004 | Webhook delivery & replay | JWT | Postgres, RabbitMQ |
| **Enrichment** | 3005 | Profile enrichment | Internal | Postgres, Redis |
| **Notification** | 3006 | Failure alerting | Internal | RabbitMQ |

### Management Service
- **Auth:** JWT access + refresh tokens, 3 roles (`admin` / `operator` / `viewer`), 19 granular permissions
- **Endpoints:** auth (register, login, refresh, logout), pipelines CRUD, destinations CRUD, API key management, usage stats
- **Security:** Helmet, CORS, Zod validation, AES-256-GCM encryption for sensitive configs

### Ingestion Service
- **Auth:** API key authentication (SHA-256 hashed, `fp_live_*` prefix)
- **Rate limiting:** Sliding window per key (Free: 100/min, Pro: 10k/min, Enterprise: 100k/min)
- **Idempotency:** Optional `Idempotency-Key` header backed by Redis (24h TTL)
- **Batch:** Up to 100 events per batch request

### Processing Service
- **Transform rules:** rename fields, drop fields, coerce types (string, number, boolean, date)
- **Lifecycle:** Updates event status (`pending` → `processing` → `enriched` → `routed`)
- **Workers:** BullMQ queues with exponential backoff

### Delivery Service
- **Webhook delivery:** Attempt logging with status, response code, latency, error
- **Replay:** Re-publish failed events to retry queue
- **Status:** Track `delivered` / `failed` / `partial_failure`

### Enrichment Service
- **Profile building:** Aggregate event history per org (count, first/last seen)
- **Cache:** In-memory TTL cache (default 300s)

### Notification Service
- **Email:** Nodemailer SMTP with HTML failure alerts
- **Slack:** Block Kit formatted webhook alerts
- **DLQ consumer:** Process messages from dead-letter queue

---

## Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js 20+, TypeScript 5.4 |
| **Monorepo** | pnpm workspaces 9, Turborepo 1.13 |
| **HTTP** | Express 4.19 |
| **Database** | PostgreSQL 16, Prisma 5.14 ORM |
| **Cache** | Redis 7 (ioredis) |
| **Queue** | RabbitMQ 3 (amqplib), BullMQ |
| **Auth** | bcryptjs, jsonwebtoken |
| **Validation** | Zod 3.22 |
| **Logging** | Winston 3.13, AsyncLocalStorage tracing |
| **Container** | Docker Compose, multi-stage builds |
| **Proxy** | Nginx |
| **Monitoring** | Prometheus, Grafana |
| **CI/CD** | GitHub Actions |
| **Testing** | Vitest |

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm@9`)
- **Docker** & **Docker Compose** (for infrastructure)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/fluxpipe.git
cd fluxpipe

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @fluxpipe/database prisma:generate

# Copy environment variables
cp .env.example .env

# Build all packages & apps
pnpm build
```

### Run with Docker Compose

```bash
# Start infrastructure (Postgres, Redis, RabbitMQ, Nginx)
docker compose up -d postgres redis rabbitmq nginx

# Run all services in development mode
pnpm dev
```

### Run individual service

```bash
# Start a single service with hot-reload
pnpm --filter @fluxpipe/management-service dev
```

### Run database migrations

```bash
pnpm --filter @fluxpipe/database prisma:migrate --name init
pnpm --filter @fluxpipe/database prisma:seed
```

---

## Project Structure

```
fluxpipe/
├── apps/
│   ├── management-service/      # Admin API — port 3001
│   ├── ingestion-service/       # Event intake — port 3002
│   ├── processing-service/      # Transform pipeline — port 3003
│   ├── delivery-service/        # Webhook delivery — port 3004
│   ├── enrichment-service/      # Profile enrichment — port 3005
│   └── notification-service/    # Failure alerts — port 3006
├── packages/
│   ├── shared-types/            # TypeScript interfaces & enums
│   ├── shared-utils/            # AppError, API response helpers
│   ├── shared-config/           # Zod-validated env config
│   ├── logger/                  # Winston + AsyncLocalStorage traceId
│   ├── auth/                    # JWT, bcrypt, RBAC permissions
│   ├── database/                # Prisma client + 6 repositories
│   ├── redis/                   # Rate limiter, cache, idempotency
│   └── rabbitmq/                # Exchanges, queues, publishers
├── infra/
│   ├── postgres/                # Init SQL
│   ├── redis/                   # Redis config
│   ├── rabbitmq/                # Definitions & config
│   ├── nginx/                   # Reverse proxy config
│   ├── prometheus/              # Monitoring config
│   └── grafana/                 # Dashboards
├── scripts/
│   ├── migrate.ts               # DB migration runner
│   ├── seed.ts                  # Seed data
│   └── setup-rabbitmq.ts        # RabbitMQ bootstrap
├── docker/
│   └── development/             # Dev Docker Compose overrides
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint → test → build matrix
│       └── deploy.yml           # Push images → SSH deploy
├── docker-compose.yml           # Full stack (dev)
├── docker-compose.prod.yml      # Production stack
├── turbo.json                   # Turborepo pipeline config
├── tsconfig.base.json           # Shared TypeScript config
└── pnpm-workspace.yaml          # Workspace definition
```

---

## API Overview

### Management API (port 3001)

```
POST   /v1/auth/register          Register new user + org
POST   /v1/auth/login             Login (returns access + refresh tokens)
POST   /v1/auth/refresh           Refresh access token
POST   /v1/auth/logout            Invalidate refresh token

GET    /v1/pipelines              List pipelines
POST   /v1/pipelines              Create pipeline
GET    /v1/pipelines/:id          Get pipeline
PATCH  /v1/pipelines/:id          Update pipeline
DELETE /v1/pipelines/:id          Delete pipeline

GET    /v1/pipelines/:id/destinations       List destinations
POST   /v1/pipelines/:id/destinations       Create destination
GET    /v1/destinations/:id                 Get destination
PATCH  /v1/destinations/:id                 Update destination
DELETE /v1/destinations/:id                 Delete destination

GET    /v1/api-keys               List API keys
POST   /v1/api-keys               Generate API key
DELETE /v1/api-keys/:id           Revoke API key

GET    /v1/usage                  Organization usage stats
```

### Ingestion API (port 3002)

```
POST   /v1/ingest                 Ingest single event
POST   /v1/ingest/batch           Ingest batch of events
GET    /v1/ingest/:id             Check event status
```

> **Header:** `Authorization: Bearer fp_live_<key>` (API key)
> **Idempotency:** `Idempotency-Key: <uuid>` (optional)

### Delivery API (port 3004)

```
GET    /v1/deliveries/:eventId    Get delivery details
POST   /v1/deliveries/:id/replay  Replay failed event
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string |
| `RABBITMQ_URL` | — | RabbitMQ connection string |
| `JWT_SECRET` | — | Access token signing key (≥32 chars) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing key (≥32 chars) |
| `LOG_LEVEL` | `debug` | Winston log level |
| `SMTP_HOST` | — | SMTP server (notifications) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `noreply@fluxpipe.io` | Notification sender |
| `ENCRYPTION_KEY` | — | AES-256-GCM key (32 chars) |

---

## Deployment

### Production Docker Compose

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Deploy stack
IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d
```

The production Compose file uses:
- Pre-built images (`fluxpipe/<service>:${IMAGE_TAG}`)
- Resource limits (CPU + memory)
- No port exposure on app services (internal network only)
- `restart: unless-stopped` for all services

### CI/CD Pipeline

| Workflow | Trigger | Stages |
|---|---|---|
| **CI** | Push to any branch, PR to `main` | Lint → Unit Tests → Integration Tests → Build Images |
| **CD** | Push to `main` | Push Docker Images → SSH Deploy → Health Check → Slack Notify |

Integration tests spin up Postgres, Redis, and RabbitMQ as service containers, run migrations against the test database, then execute the test suite.

---

## Monitoring

- **Prometheus:** Metrics collection at `http://localhost:9090`
- **Grafana:** Dashboards at `http://localhost:3000` (admin/admin)
- **RabbitMQ:** Management UI at `http://localhost:15672`
- **Nginx:** Reverse proxy at `http://localhost:80`

---

## Packages

| Package | Description |
|---|---|
| `@fluxpipe/shared-types` | Event, pipeline, user, and delivery type definitions |
| `@fluxpipe/shared-utils` | `AppError`, pagination helpers, standardized API responses |
| `@fluxpipe/shared-config` | Zod-validated environment configuration |
| `@fluxpipe/logger` | Winston logger with AsyncLocalStorage-based distributed tracing |
| `@fluxpipe/auth` | JWT signing/verification, bcrypt hashing, RBAC permissions |
| `@fluxpipe/database` | Prisma client singleton, 6 repository classes |
| `@fluxpipe/redis` | Connection manager, rate limiter, cache, idempotency, denylist |
| `@fluxpipe/rabbitmq` | Exchange/queue setup with DLX, publishers, consumers |

---

## Database (Prisma)

8 models with full relations and composite indexes:

```
Organization ──┬── User        (org_members)
               ├── Pipeline    (org_pipelines)
               ├── Event       (org_events)
               └── ApiKey      (org_keys)

Pipeline ──┬── Destination    (pipeline_destinations)
           └── Event          (pipeline_events)

Event ──┬── DeliveryAttempt   (event_deliveries)
        └── EventLog         (event_logs)
```

---

## Development

```bash
# Lint all packages
pnpm lint

# Run tests
pnpm test

# Build all packages
pnpm build

# Clean dist directories
pnpm clean

# Format code
pnpm format
```

### Add a new package

```bash
mkdir packages/my-package
cd packages/my-package
pnpm init

# Add to workspace (already covered by pnpm-workspace.yaml)
pnpm install
```

---

## License

MIT
# flux-pipe
