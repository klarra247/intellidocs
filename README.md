# IntelliDocs

SMB를 위한 Document Intelligence SaaS — 문서를 올리고, 그냥 물어보세요.

## 주요 기능

- **문서 업로드 & 자동 파싱** — PDF, XLSX, DOCX, TXT, MD 지원. 업로드 즉시 비동기 파싱 → SSE로 실시간 진행률 표시
- **하이브리드 검색** — Elasticsearch BM25 (키워드) + Qdrant 벡터 (의미) 검색을 RRF로 융합
- **AI 에이전트 채팅** — LangChain4j 기반 RAG Agent가 7개 도구를 활용해 문서 기반 답변 생성, SSE 스트리밍
- **표 구조 추출** — 테이블 데이터를 마크다운 표로 정리, CSV 다운로드 지원
- **차트 시각화** — 수치 데이터 기반 자동 차트 생성 (Recharts)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Main API | Spring Boot 3.x, Java 21, LangChain4j |
| Parsing Service | Python FastAPI, PyMuPDF, openpyxl |
| Keyword Search | Elasticsearch 8.x (BM25 + Nori) |
| Semantic Search | Qdrant (Vector DB, Voyage AI embeddings) |
| Cache | Redis 7.x |
| Message Queue | RabbitMQ 3.13 |
| Database | PostgreSQL 16 |
| Reverse Proxy | Nginx |
| LLM | Claude API (Anthropic) / OpenAI |

## 아키텍처

```
                        ┌─── Nginx (:80) ───┐
                        │                    │
                  /api/*│                    │/*
                        ▼                    ▼
                  Spring Boot          Next.js
                    (:8080)             (:3000)
                   ┌──┴──┐
                   │     │
              ┌────┘     └────┐
              ▼               ▼
         PostgreSQL      RabbitMQ ──► Python Parser
           Redis                        (:8000)
        Elasticsearch
           Qdrant
```

업로드된 문서는 Python Parser가 청킹 → Spring Boot가 ES/Qdrant에 인덱싱 → 사용자 질문 시 하이브리드 검색(BM25+벡터) + LLM Agent가 답변 생성.

## 로컬 개발

### 사전 준비

- Docker Desktop
- Java 21, Node.js 20, Python 3.11
- LLM API 키 (Anthropic 또는 OpenAI)

### 인프라 실행

```bash
docker compose -f docker-compose.infra.yml up -d
bash infra/verify.sh
```

### 백엔드

```bash
cd backend
# application.yml 설정 (gitignored)
./gradlew bootRun
```

### 파싱 서비스

```bash
cd parsing-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

## 프로덕션 배포 (Docker Compose)

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일 편집 — DB_PASSWORD, REDIS_PASSWORD, RABBITMQ_PASSWORD, API 키 입력

# 2. 배포
bash scripts/deploy.sh
```

자세한 EC2 배포 가이드: [docs/deploy-ec2.md](docs/deploy-ec2.md)

## 프로젝트 구조

```
intellidocs/
├── backend/                  # Spring Boot API (Java 21, Gradle)
│   ├── Dockerfile
│   └── src/main/java/com/intellidocs/
│       ├── config/           # Spring 설정 (RabbitMQ, Redis, Qdrant, ES)
│       ├── common/           # ApiResponse, 예외 처리
│       ├── domain/
│       │   ├── document/     # 문서 업로드/관리, SSE
│       │   ├── agent/        # RAG Agent (LangChain4j)
│       │   ├── search/       # 하이브리드 검색
│       │   └── chat/         # 채팅 세션/메시지
│       └── infrastructure/   # RabbitMQ 리스너
├── parsing-service/          # Python FastAPI Parser
│   ├── Dockerfile
│   └── app/
│       ├── parsers/          # PDF, XLSX, DOCX, TXT 파서
│       └── chunking/         # 문서 청킹
├── frontend/                 # Next.js 14
│   ├── Dockerfile
│   ├── app/                  # App Router 페이지
│   ├── components/           # React 컴포넌트
│   ├── stores/               # Zustand 상태 관리
│   └── lib/                  # API 클라이언트, SSE
├── infra/
│   ├── postgres/init.sql     # DB 스키마
│   ├── elasticsearch/        # ES + Nori 플러그인
│   ├── rabbitmq/             # 큐/익스체인지 정의
│   └── nginx/nginx.conf      # 리버스 프록시
├── scripts/deploy.sh         # 배포 자동화
├── docker-compose.yml        # 프로덕션 (9 서비스)
├── docker-compose.infra.yml  # 인프라만 (개발용)
└── .env.example              # 환경변수 템플릿
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/documents/upload` | 문서 업로드 (multipart) |
| GET | `/api/v1/documents` | 문서 목록 조회 |
| GET | `/api/v1/documents/{id}` | 문서 상세 조회 |
| DELETE | `/api/v1/documents/{id}` | 문서 삭제 |
| GET | `/api/v1/documents/{id}/status` | 파싱 진행 SSE 스트림 |
| POST | `/api/v1/search` | 하이브리드 검색 |
| POST | `/api/v1/agent/chat` | AI 채팅 (동기) |
| POST | `/api/v1/agent/chat/stream` | AI 채팅 SSE 스트림 |
| GET | `/api/v1/agent/chat/history` | 채팅 히스토리 조회 |

## 서비스 포트

| Service | Port |
|---------|------|
| Nginx (프로덕션) | 80 |
| Spring Boot API | 8080 |
| Python Parser | 8000 |
| Next.js Frontend | 3000 |
| PostgreSQL | 5432 |
| Elasticsearch | 9200 |
| Qdrant REST / gRPC | 6333 / 6334 |
| Redis | 6379 |
| RabbitMQ AMQP / UI | 5672 / 15672 |
