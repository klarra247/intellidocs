#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/init-ssl.sh intellidocs.org your@email.com

DOMAIN="${1:?Usage: bash scripts/init-ssl.sh <domain> <email>}"
EMAIL="${2:?Usage: bash scripts/init-ssl.sh <domain> <email>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[ssl]${NC} $*"; }
err() { echo -e "${RED}[ssl]${NC} $*" >&2; }

# 1. Nginx가 HTTP 모드로 실행 중인지 확인
if ! docker compose ps nginx | grep -q "running"; then
  err "Nginx가 실행 중이 아닙니다. 먼저 'bash scripts/deploy.sh'를 실행하세요."
  exit 1
fi

# 2. Certbot으로 인증서 발급
log "Let's Encrypt 인증서 발급 중... (도메인: ${DOMAIN})"
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# 3. nginx.conf를 HTTPS 템플릿으로 교체
log "Nginx 설정을 HTTPS로 전환 중..."
DOMAIN="$DOMAIN" envsubst '${DOMAIN}' \
  < infra/nginx/nginx.conf.template \
  > infra/nginx/nginx.conf

# 4. Nginx 재시작
log "Nginx 재시작..."
docker compose restart nginx

# 5. 인증서 자동 갱신 cron 등록
log "인증서 자동 갱신 cron 등록..."
CRON_CMD="0 3 * * * cd ${PROJECT_DIR} && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew" || true; echo "$CRON_CMD") | crontab -

log "완료! https://${DOMAIN} 에서 확인하세요."
