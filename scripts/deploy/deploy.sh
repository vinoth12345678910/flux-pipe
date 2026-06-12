#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# FluxPipe Deploy
# Pull latest code, rebuild images, restart stack.
# ──────────────────────────────────────────────

cd /opt/fluxpipe

echo "==> Pulling latest code..."
git pull origin main

echo "==> Rebuilding images..."
docker compose -f docker-compose.prod.yml build --parallel

echo "==> Restarting stack..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Waiting for health checks..."
for service in management-service ingestion-service processing-service delivery-service enrichment-service notification-service; do
  printf "   %-30s" "$service..."
  if docker compose -f docker-compose.prod.yml exec -T "$service" \
    sh -c "wget -qO- http://localhost/health 2>/dev/null || exit 1" > /dev/null 2>&1; then
    echo "OK"
  else
    echo "FAIL"
  fi
done

echo "==> Pruning old images..."
docker image prune -f

echo ""
echo "==> Deploy complete!"
