#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

# 1. .env check
if [ ! -f .env ]; then
  err ".env file not found. Copy .env.example and fill in values:"
  err "  cp .env.example .env"
  exit 1
fi

log ".env file found"

# 2. Git pull (skip if not a git repo or no remote)
if git rev-parse --is-inside-work-tree &>/dev/null && git remote get-url origin &>/dev/null; then
  log "Pulling latest changes..."
  git pull --ff-only || { warn "git pull failed — continuing with local code"; }
fi

# 3. Build
log "Building images..."
docker compose build --parallel

# 4. Start services
log "Starting services..."
docker compose up -d

# 5. Wait for API healthcheck
log "Waiting for API to become healthy (up to 180s)..."
SECONDS=0
MAX_WAIT=180
while [ $SECONDS -lt $MAX_WAIT ]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' intellidocs-api 2>/dev/null || echo "not_found")
  if [ "$STATUS" = "healthy" ]; then
    log "API is healthy! (${SECONDS}s)"
    break
  fi
  if [ "$STATUS" = "unhealthy" ]; then
    err "API is unhealthy. Check logs: docker compose logs api"
    exit 1
  fi
  sleep 5
done

if [ $SECONDS -ge $MAX_WAIT ]; then
  warn "Timed out waiting for API health. Check logs: docker compose logs api"
fi

# 6. Status
echo ""
log "Service status:"
docker compose ps
echo ""
log "Deployment complete!"
