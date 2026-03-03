# EC2 배포 가이드

## 권장 사양

| 항목 | 최소 | 권장 |
|------|------|------|
| 인스턴스 | t3.medium (4GB) | t3.large (8GB) |
| 디스크 | 30GB gp3 | 50GB gp3 |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

> Elasticsearch + Qdrant + Spring Boot + Python이 동시 실행되므로 8GB RAM 권장.

## 1. 초기 서버 설정

### Docker 설치

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose (v2, Docker에 포함됨)
docker compose version
```

### Swap 설정 (4GB 권장)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 적용
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Elasticsearch vm.max_map_count

```bash
# 즉시 적용
sudo sysctl -w vm.max_map_count=262144

# 영구 적용
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
```

## 2. 프로젝트 클론 및 설정

```bash
git clone https://github.com/your-org/intellidocs.git
cd intellidocs

# 환경변수 설정
cp .env.example .env
nano .env
```

`.env` 필수 값:

```
DB_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
RABBITMQ_PASSWORD=<strong-password>
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
EXTERNAL_URL=https://intellidocs.org
DOMAIN=intellidocs.org
```

## 3. 배포

```bash
bash scripts/deploy.sh
```

## 3-1. HTTPS 설정 (Let's Encrypt)

배포 후 SSL 인증서 발급:

```bash
bash scripts/init-ssl.sh intellidocs.org your@email.com
```

이 스크립트가 자동으로:
1. Certbot으로 인증서 발급 (HTTP challenge)
2. Nginx를 HTTPS 모드로 전환
3. 인증서 자동 갱신 cron 등록 (매일 03시)

배포 완료 후 `http://<EC2-IP>` 접속.

## 4. 보안 그룹 설정

| Port | Protocol | Source | 용도 |
|------|----------|--------|------|
| 22 | TCP | My IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (추후) |

> 8080, 5432, 9200, 6333, 6379, 5672 등 내부 서비스 포트는 **열지 않음**. Docker 내부 네트워크에서만 통신.

## 5. 업데이트 배포

```bash
cd intellidocs
bash scripts/deploy.sh
```

`deploy.sh`가 자동으로 `git pull` → `docker compose build` → `up -d` → healthcheck까지 수행.

## 트러블슈팅

### Elasticsearch 시작 실패

```
max virtual memory areas vm.max_map_count [65530] is too low
```

**해결**: `sudo sysctl -w vm.max_map_count=262144`

### API가 unhealthy 상태

```bash
# 로그 확인
docker compose logs api --tail 50

# DB 연결 확인
docker compose exec postgres pg_isready -U intellidocs
```

주로 DB 마이그레이션 실패 또는 환경변수 누락이 원인.

### 메모리 부족 (OOM)

```bash
# 메모리 사용량 확인
docker stats --no-stream

# swap 확인
free -h
```

t3.medium(4GB)에서 OOM 발생 시 t3.large(8GB)로 업그레이드하거나 swap을 4GB로 설정.

### RabbitMQ 연결 실패

```bash
# RabbitMQ 상태 확인
docker compose logs rabbitmq --tail 20

# 큐 목록 확인
docker compose exec rabbitmq rabbitmqctl list_queues -p intellidocs
```

`RABBITMQ_PASSWORD`가 `.env`에 올바르게 설정되어 있는지 확인.
