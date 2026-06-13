# FluxPipe Runbook

## Deployment

### First-time VPS setup
```bash
ssh root@<vps-ip>
./scripts/deploy/setup-vps.sh
```

### Redeploy
```bash
ssh root@<vps-ip>
./scripts/deploy/deploy.sh
```

### Local
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Services & Ports

| Service          | Internal Port | Container |
|------------------|--------------|-----------|
| management       | 3001         | management-service |
| ingestion        | 3002         | ingestion-service |
| processing       | 3003         | processing-service |
| delivery         | 3004         | delivery-service |
| enrichment       | 3005         | enrichment-service |
| notification     | 3006         | notification-service |
| PostgreSQL       | 5432         | postgres |
| Redis            | 6379         | redis |
| RabbitMQ         | 5672         | rabbitmq |
| RabbitMQ Admin   | 15672        | rabbitmq |
| Nginx            | 80 / 443     | nginx |

## Health Checks

Check all services:
```bash
for svc in management ingestion processing delivery enrichment notification; do
  curl -f http://localhost:${port}/health && echo "$svc OK" || echo "$svc DOWN"
done
```

## Logs

### Follow all services
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Follow a specific service
```bash
docker compose -f docker-compose.prod.yml logs -f processing-service
```

### View last N lines
```bash
docker compose -f docker-compose.prod.yml logs --tail=100
```

## Bull Board

Dashboard: `https://<domain>/admin/queues`
Requires admin JWT token in `Authorization: Bearer <token>` header.

### Queue Actions
- Retry failed jobs from the dashboard
- Clean completed/failed jobs
- Monitor queue depth and processing rates

## Common Issues

### Service won't start
```bash
# Check logs
docker compose logs <service>
# Verify DB is reachable
docker compose exec postgres pg_isready
# Verify Redis
docker compose exec redis redis-cli ping
# Verify RabbitMQ
docker compose exec rabbitmq rabbitmqctl status
```

### High queue backlog
1. Check Bull Board for queue depth
2. Scale worker concurrency: update `concurrency` in Worker constructor
3. Restart the affected service: `docker compose restart <service>`

### SSL certificate renewal
```bash
docker compose run --rm certbot renew
```
Automated: runs daily via cron in the nginx container.

### Database migration
```bash
docker compose exec management-service npx prisma migrate deploy
```

### Full reset (loses data)
```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Metrics endpoint
```
GET /metrics  → { service, uptime, memory }
```

### Key metrics to watch
- Queue depth per BullMQ queue
- Delivery success/failure rate
- Processing latency (end-to-end)
- RabbitMQ queue depth

## Backup & Recovery

### Database backup
```bash
docker compose exec postgres pg_dump -U fluxpipe fluxpipe > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
cat backup.sql | docker compose exec -T postgres psql -U fluxpipe fluxpipe
```

### Redis RDB backup
```bash
docker compose exec redis redis-cli SAVE
# RDB file at /data/dump.rdb in the container
```

## Maintenance

### Update env vars
1. Edit `.env.production`
2. Run `./scripts/deploy/deploy.sh`

### Update dependencies
```bash
pnpm update
pnpm build
git commit -am "chore: update deps"
```

## Incident Response

1. **Service down**: Check logs, verify dependencies (DB, Redis, RabbitMQ)
2. **Data loss**: Restore from backup
3. **Security incident**: Revoke API keys, rotate JWT secrets, check audit logs
4. **Performance degradation**: Check CPU/memory, queue depths, database query performance
