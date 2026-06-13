# FluxPipe API Reference

## Management Service (:3001)

### Authentication
```
POST /v1/auth/login          { email, password } → { accessToken, refreshToken }
POST /v1/auth/register       { email, password, name } → { user, token }
POST /v1/auth/refresh        { refreshToken } → { accessToken }
```

### Organizations
```
GET    /v1/orgs               → Organization[]
POST   /v1/orgs               { name, plan } → Organization
GET    /v1/orgs/:id           → Organization
PATCH  /v1/orgs/:id           { name, plan } → Organization
DELETE /v1/orgs/:id           → 204
```

### Pipelines
```
GET    /v1/orgs/:orgId/pipelines     → Pipeline[]
POST   /v1/orgs/:orgId/pipelines     { name, config } → Pipeline
GET    /v1/pipelines/:id             → Pipeline
PATCH  /v1/pipelines/:id             { name, config } → Pipeline
DELETE /v1/pipelines/:id             → 204
```

### Destinations
```
GET    /v1/pipelines/:pipelineId/destinations → Destination[]
POST   /v1/pipelines/:pipelineId/destinations { type, config, isActive } → Destination
PATCH  /v1/destinations/:id                   { type, config, isActive } → Destination
DELETE /v1/destinations/:id                   → 204
```

### API Keys
```
GET    /v1/api-keys               → ApiKey[]
POST   /v1/api-keys               { name } → { key, secret }
DELETE /v1/api-keys/:id           → 204
```

### Audit Log
```
GET    /v1/audit-logs             → AuditLog[]
GET    /v1/audit-logs?orgId=:id   → AuditLog[]
GET    /v1/audit-logs?userId=:id  → AuditLog[]
```

### Users
```
GET    /v1/users/me               → User
PATCH  /v1/users/me               { name, email } → User
```

## Ingestion Service (:3002)

### Event Ingestion
```
POST /v1/ingest              { eventType, data, source } → { eventId, status }
       Headers: X-Api-Key, X-Org-Id (or JWT Bearer)
```

### Health
```
GET /health                  { status, service, timestamp }
```

## Processing Service (:3003)

### Health & Metrics
```
GET /health                  { status, service, timestamp }
GET /metrics                 { service, uptime, memory }
```

### Bull Board (admin JWT required)
```
GET /admin/queues            Bull Board dashboard
       Headers: Authorization: Bearer <admin-token>
```

## Delivery Service (:3004)

### Deliveries
```
GET /v1/deliveries/:eventId           → Delivery[]
POST /v1/deliveries/:id/replay        → { status, jobId }
```

### Health
```
GET /health                  { status, service, timestamp }
```

## Enrichment Service (:3005)

### Health
```
GET /health                  { status, service, timestamp }
```

## Notification Service (:3006)

### Health
```
GET /health                  { status, service, timestamp }
```

## Response Envelope

Success:
```json
{ "data": <resource>, "meta": { "page": 1, "pageSize": 20, "total": 100 } }
```

Error:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK |
| 201  | Created |
| 204  | No Content |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 409  | Conflict |
| 422  | Unprocessable Entity |
| 429  | Rate Limited |
| 500  | Internal Server Error |

## Rate Limiting

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
Limit: 100 requests/minute per API key/IP.
