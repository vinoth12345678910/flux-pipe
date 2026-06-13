# FluxPipe Architecture

## System Overview

FluxPipe is an event-pipeline platform with 6 microservices, 8 shared packages, and 3 infrastructure dependencies.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients / SDKs                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (ingest)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    management-service (:3001)                    │
│   Admin API: orgs, pipelines, destinations, API keys, audit     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ingestion-service (:3002)                     │
│     HTTP ingest → validate → publish to events.ingested         │
└──────────┬──────────────────────────────────────────────────────┘
           │ RabbitMQ
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   processing-service (:3003)                     │
│   RabbitMQ consumer → BullMQ pipeline (transform → enrich →     │
│   route) → publish to events.processed                          │
└──────────┬──────────────────────────────────────────────────────┘
           │ RabbitMQ
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    delivery-service (:3004)                      │
│   RabbitMQ consumer → BullMQ workers → HTTP webhook delivery    │
│   → event status tracking (saga pattern)                        │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────┐  ┌──────────────────────────────────────┐
│ enrichment-service  │  │            notification-service       │
│       (:3005)       │  │                (:3006)               │
│ Profile enrichment  │  │   DLQ consumer → Email/Slack alerts   │
│ Redis-cached lookups│  │   BullMQ notification workers         │
└─────────────────────┘  └──────────────────────────────────────┘
```

## Shared Packages

- **@fluxpipe/shared-types** — TypeScript interfaces and enums
- **@fluxpipe/shared-utils** — Utility functions
- **@fluxpipe/shared-config** — Env parsing with Zod
- **@fluxpipe/logger** — Winston logger with AsyncLocalStorage tracing
- **@fluxpipe/auth** — JWT sign/verify, RBAC middleware
- **@fluxpipe/database** — Prisma client + 6 repositories
- **@fluxpipe/redis** — ioredis client + rate-limit, idempotency, cache, denylist
- **@fluxpipe/rabbitmq** — amqplib exchanges, queues, publishers, consumers

## Infrastructure

| Component | Purpose |
|-----------|---------|
| PostgreSQL + Prisma | Primary data store |
| Redis + ioredis | BullMQ queues, caching, rate limiting, idempotency |
| RabbitMQ + amqplib | Event bus between services |
| BullMQ | Job queues within processing/delivery/enrichment/notification |
| Bull Board | Admin dashboard at `/admin/queues` |
| Nginx | Reverse proxy + SSL termination |

## Exchange Topology

```
events.ingested (topic)  → events.processing queue → processing-service
events.processed (topic) → delivery.webhook queue  → delivery-service
events.failed (direct)   → events.dlq queue        → notification-service
events.retry (direct)    → events.retry.delay queue → (retry after TTL)
```

## Data Flow (full path)

1. Client sends event → ingestion-service REST API
2. Ingestion validates, enriches headers, publishes to `events.ingested`
3. Processing-service consumes from `events.processing` queue
4. Event passes through 3 BullMQ stages: transform → enrich → route
5. Route stage publishes to `events.processed` exchange
6. Delivery-service consumes from `delivery.webhook` queue
7. Saga fans out to each destination via BullMQ workers (HTTP webhook)
8. On failure, saga publishes to `events.failed` → `events.dlq`
9. Notification-service DLQ consumer sends email/Slack alerts
