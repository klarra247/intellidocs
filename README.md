# 🧠 IntelliDocs

> **SMB를 위한 Document Intelligence SaaS**
> 문서를 올리고, 그냥 물어보세요. 표로 정리해드립니다.

🌐 [intellidocs.org](https://intellidocs.org)

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS |
| **Main API** | Spring Boot 3.x, LangChain4j |
| **Parsing Service** | Python FastAPI |
| **Keyword Search** | Elasticsearch 8.x (BM25) |
| **Semantic Search** | Qdrant (Vector DB) |
| **Cache** | Redis |
| **Message Queue** | RabbitMQ |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker, Kubernetes |
| **LLM** | Claude API (Anthropic) |

---

## 🚀 로컬 실행

### 사전 준비
- Docker Desktop 설치
- LLM API 키 준비 (Anthropic or OpenAI)

### 1. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 열어서 LLM_API_KEY 값 입력
```

### 2. 인프라만 먼저 띄우기 (앱 코드 없이 연결 테스트)
```bash
docker compose -f docker-compose.infra.yml up -d
```

### 3. 연결 검증
```bash
bash infra/verify.sh
```

### 4. 전체 스택 실행 (앱 코드 완성 후)
```bash
docker compose up -d
```

---

## 📁 프로젝트 구조

```
intellidocs/
├── docker-compose.yml           # 전체 스택
├── docker-compose.infra.yml     # 인프라만 (개발 초기)
├── .env.example                 # 환경변수 템플릿
│
├── backend/
│   ├── api/                     # Spring Boot (Main API)
│   │   ├── Dockerfile
│   │   └── src/
│   └── parser/                  # Python FastAPI (Parsing)
│       ├── Dockerfile
│       └── app/
│
├── frontend/                    # Next.js
│   ├── Dockerfile
│   └── src/
│
└── infra/
    ├── postgres/
    │   └── init.sql             # DB 초기 스키마
    ├── rabbitmq/
    │   └── definitions.json     # Queue/Exchange 설정
    └── verify.sh                # 연결 검증 스크립트
```

---

## 🗺️ 로드맵

- [x] 인프라 셋업
- [ ] **Phase 1:** 문서 파싱 파이프라인 (PDF/Excel/Word)
- [ ] **Phase 2:** 하이브리드 검색 (ES + Qdrant)
- [ ] **Phase 3:** AI Agent + 정보 추출/Export
- [ ] **Phase 4:** Next.js UI + 배포
- [ ] **V2:** Knowledge Graph 시각화, 팀 협업, Freemium 수익화
