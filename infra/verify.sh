#!/bin/bash
# ─────────────────────────────────────────
# IntelliDocs 인프라 연결 검증 스크립트
# 사용법: bash infra/verify.sh
# ─────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✅ $1${NC}"; }
fail() { echo -e "${RED}  ❌ $1${NC}"; }
info() { echo -e "${YELLOW}  ⏳ $1${NC}"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IntelliDocs 인프라 연결 검증"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. PostgreSQL
info "PostgreSQL 연결 확인..."
if docker exec intellidocs-postgres pg_isready -U intellidocs -d intellidocs > /dev/null 2>&1; then
  pass "PostgreSQL (port 5432)"
else
  fail "PostgreSQL — 컨테이너 로그 확인: docker logs intellidocs-postgres"
fi

# 2. Elasticsearch
info "Elasticsearch 연결 확인..."
ES_STATUS=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$ES_STATUS" = "green" ] || [ "$ES_STATUS" = "yellow" ]; then
  pass "Elasticsearch (port 9200) — status: $ES_STATUS"
else
  fail "Elasticsearch — 컨테이너 로그 확인: docker logs intellidocs-elasticsearch"
fi

# 3. Qdrant
info "Qdrant 연결 확인..."
QDRANT_STATUS=$(curl -s http://localhost:6333/healthz 2>/dev/null)
if [ "$QDRANT_STATUS" = "healthz check passed" ]; then
  pass "Qdrant (port 6333)"
else
  fail "Qdrant — 컨테이너 로그 확인: docker logs intellidocs-qdrant"
fi

# 4. Redis
info "Redis 연결 확인..."
REDIS_PONG=$(docker exec intellidocs-redis redis-cli -a intellidocs_secret ping 2>/dev/null)
if [ "$REDIS_PONG" = "PONG" ]; then
  pass "Redis (port 6379)"
else
  fail "Redis — 컨테이너 로그 확인: docker logs intellidocs-redis"
fi

# 5. RabbitMQ
info "RabbitMQ 연결 확인..."
if docker exec intellidocs-rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; then
  pass "RabbitMQ (port 5672) — 관리 UI: http://localhost:15672"
else
  fail "RabbitMQ — 컨테이너 로그 확인: docker logs intellidocs-rabbitmq"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  접속 정보"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RabbitMQ 관리 UI : http://localhost:15672"
echo "  → ID: intellidocs / PW: intellidocs_secret"
echo ""
echo "  Qdrant Dashboard  : http://localhost:6333/dashboard"
echo "  Elasticsearch     : http://localhost:9200"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
