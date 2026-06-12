#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# FluxPipe VPS Bootstrap
# Run ONCE on a fresh VPS to install Docker,
# clone the repo, and provision SSL certs.
# ──────────────────────────────────────────────

REPO_URL="${REPO_URL:-git@github.com:vinoth12345678910/flux-pipe.git}"
DOMAIN="${DOMAIN:-fluxpipe.example.com}"
EMAIL="${EMAIL:-admin@example.com}"

echo "==> Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
  ca-certificates curl git \
  ufw

echo "==> Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Cloning repository..."
git clone "$REPO_URL" /opt/fluxpipe
cd /opt/fluxpipe

echo "==> Creating production env..."
if [ ! -f .env.production ]; then
  cp .env.production .env.production
  # Generate random secrets
  sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 32)/" .env.production
  sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(openssl rand -base64 32)/" .env.production
  sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)/" .env.production
  sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -base64 16)/" .env.production
  sed -i "s/change-this-password/$(openssl rand -base64 16)/g" .env.production
  sed -i "s/change-this-rabbitmq-password/$(openssl rand -base64 16)/g" .env.production
  sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env.production
  echo "   Secrets generated in .env.production"
fi

echo "==> Provisioning SSL certificate..."
mkdir -p /opt/fluxpipe/infra/nginx/ssl
docker run --rm \
  -p 80:80 \
  -v /opt/fluxpipe/infra/nginx/ssl:/etc/letsencrypt \
  -v /opt/fluxpipe/infra/nginx/ssl:/var/www/certbot \
  certbot/certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" || echo "   SSL skipped — set up manually with: scripts/deploy/ssl.sh"

echo "==> Building and starting services..."
docker compose -f docker-compose.prod.yml build --parallel
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "==> Setup complete!"
echo "    Domain: https://$DOMAIN"
echo "    Management API: https://$DOMAIN/health"
echo ""
echo "    Next steps:"
echo "      1. Update DNS A record to point $DOMAIN to this server's IP"
echo "      2. Register a user: curl -X POST https://$DOMAIN/v1/auth/register ..."
echo "      3. Monitor logs: docker compose -f /opt/fluxpipe/docker-compose.prod.yml logs -f"
