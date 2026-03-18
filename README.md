# IntelliDocs

> 여러 문서를 올리고, 그냥 물어보세요 — AI가 분석하고, 비교하고, 정리합니다.

![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?logo=springboot)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue)

**배포**: [https://intellidocs.org](https://intellidocs.org)

<!-- DEMO GIF HERE -->

---

## 프로젝트 소개

IntelliDocs는 **멀티 문서 AI 분석 SaaS 플랫폼**입니다.
재무/법무/기획팀이 여러 문서(PDF, Excel, Word)를 올리면 AI Agent가 자율적으로 분석·비교·정리합니다.
단순 챗봇이 아닌 **9개 Tool을 활용하는 Agent 기반 자율 분석**, 문서 간 **수치 불일치 자동 탐지**, **Knowledge Graph 시각화**가 핵심 차별점입니다.

---

## 주요 기능

### 📄 문서 업로드 & AI 분석
PDF/Excel/Word 업로드 → 자동 파싱 → 하이브리드 검색(ES BM25 + Qdrant 벡터) → AI Agent가 자연어로 답변.
SSE 스트리밍으로 실시간 응답.

<!-- Screenshot: document-upload -->

### 📊 데이터 시각화
수치 데이터를 표·차트로 자동 생성. CSV 다운로드 지원.

<!-- Screenshot: chart-visualization -->

### ⚠️ 수치 불일치 탐지
같은 항목이 문서마다 다른 수치를 가지면 자동으로 경고. 허용 오차(tolerance) 설정 가능.

<!-- Screenshot: discrepancy-detection -->

### 📋 리포트 PDF 생성
"분석 리포트 만들어줘" → 표지 + 요약 + 분석 + 출처 포함 PDF 자동 생성.

<!-- Screenshot: report-pdf -->

### 🔍 문서 뷰어 + 출처 추적
AI 답변의 출처 클릭 → 원본 문서 해당 페이지로 바로 이동.

<!-- Screenshot: document-viewer -->

### 🔄 문서 버전 관리 + Diff
새 버전 업로드 시 자동 연결. 1분기 → 2분기 뭐가 바뀌었는지 자동 비교.

<!-- Screenshot: version-diff -->

### 🕸️ Knowledge Graph
문서 간 공통 지표를 시각적 그래프로 연결. React Flow 기반 인터랙티브 탐색.

<!-- Screenshot: knowledge-graph -->

### 👥 팀 워크스페이스
이메일 초대, 역할(Owner/Admin/Member) 관리, 채팅 세션 공유, 메시지 코멘트, 문서 리뷰 상태 관리.

<!-- Screenshot: team-workspace -->

### 🔔 알림 시스템
코멘트, 세션 공유, 리뷰 요청, 문서 인덱싱 완료 등 10종 인앱 알림. 벨 아이콘 + 전체 알림 페이지.

<!-- Screenshot: notifications -->

### 🔐 인증
JWT Access/Refresh Token Rotation + Google OAuth 로그인.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Spring Boot 3.x, Java 21, LangChain4j |
| AI/LLM | OpenAI GPT-4.1-mini, text-embedding-3-small |
| Document Parsing | Python FastAPI, PyMuPDF, openpyxl, python-docx |
| Search | Elasticsearch 8.x (BM25 + Nori) + Qdrant (Vector), RRF Fusion |
| Frontend | Next.js 14, Tailwind CSS, Zustand, Recharts, React Flow |
| Database | PostgreSQL 16, Redis 7.x |
| Message Queue | RabbitMQ 3.13 |
| Auth | JWT (Access + Refresh Rotation), Google OAuth |
| Infra | Docker Compose, AWS EC2, Nginx, Let's Encrypt SSL |

---

## 시스템 아키텍처

```
                         ┌─── Nginx (:80/:443) ───┐
                         │                         │
                   /api/*│                         │/*
                         ▼                         ▼
                   Spring Boot               Next.js
                     (:8080)                  (:3000)
                        │
        ┌───────┬───────┼───────┬───────┬───────┐
        ▼       ▼       ▼       ▼       ▼       ▼
    Document  Search  Agent  Report  Discre-  Notifi-
    Service   Service Service Service pancy   cation
        │       │       │               │
        │   ┌───┴───┐   │               │
        │   ▼       ▼   ▼               │
        │  ES    Qdrant LangChain4j     │
        │ (BM25) (Vec)  (9 Tools)       │
        │                               │
        ▼                               │
    RabbitMQ ──────► Python Parser      │
                      (:8000)           │
        │                               │
        └───────────────┬───────────────┘
                        ▼
                   PostgreSQL
                     Redis
```

문서 업로드 → RabbitMQ → Python Parser가 파싱/청킹 → Spring Boot가 ES+Qdrant에 인덱싱 → 사용자 질문 시 하이브리드 검색 + AI Agent가 답변 생성.

---

## 프로젝트 구조

```
intellidocs/
├── backend/                    # Spring Boot API
│   └── src/main/java/com/intellidocs/
│       ├── domain/
│       │   ├── agent/          # AI Agent + 9 Tools
│       │   ├── document/       # 업로드/파싱/버전관리
│       │   ├── search/         # 하이브리드 검색
│       │   ├── chat/           # 채팅 세션/코멘트/핀
│       │   ├── report/         # 리포트 PDF 생성
│       │   ├── discrepancy/    # 수치 불일치 탐지
│       │   ├── diff/           # 버전 Diff 엔진
│       │   ├── knowledgegraph/ # Knowledge Graph
│       │   ├── notification/   # 알림 시스템
│       │   ├── auth/           # JWT + OAuth
│       │   └── workspace/      # 팀 워크스페이스
│       ├── config/             # Security, Async, CORS
│       └── infrastructure/     # ES, Qdrant, Redis, RabbitMQ
├── parsing-service/            # Python FastAPI Parser
├── frontend/                   # Next.js 14
│   ├── app/                    # App Router 페이지
│   ├── components/             # React 컴포넌트
│   ├── stores/                 # Zustand 상태 관리
│   └── lib/                    # API 클라이언트, SSE
├── infra/
│   ├── postgres/               # DB 스키마 + 마이그레이션
│   ├── elasticsearch/          # ES + Nori 플러그인
│   ├── rabbitmq/               # 큐/익스체인지 정의
│   └── nginx/                  # 리버스 프록시
├── docker-compose.yml          # 프로덕션 (9 서비스)
├── docker-compose.infra.yml    # 인프라만 (개발용)
└── .env.example                # 환경변수 템플릿
```

---

## 로컬 실행

### 사전 준비
- Docker Desktop
- OpenAI API 키

### 실행

```bash
# 1. 클론
git clone https://github.com/klarra247/intellidocs.git
cd intellidocs

# 2. 환경변수
cp .env.example .env
# .env에서 OPENAI_API_KEY, JWT_SECRET, DB_PASSWORD 등 설정

# 3. 전체 스택 실행
docker compose up -d --build

# 4. 접속
# http://localhost (Nginx → Frontend)
# http://localhost/api (Nginx → API)
```

---

## 핵심 설계 결정

### Hybrid Search (ES + Qdrant + RRF)
키워드 정확도(BM25)와 의미 검색(Vector)을 RRF(Reciprocal Rank Fusion)로 결합. 단일 검색 대비 재현율과 정확도 모두 향상.

### AI Agent vs 단순 RAG
질문 유형에 따라 9개 Tool(문서 검색, 수치 비교, 계산, 리포트 생성 등) 중 적절한 조합을 Agent가 자율 선택. 단순 검색→응답 파이프라인보다 복잡한 분석 질문에 강점.

### 채팅 세션 공유: 읽기 전용
공유된 세션에서 다른 멤버는 열람만 가능하고 질문은 생성자만 가능. RAG 컨텍스트 오염 방지.

### Knowledge Graph: PostgreSQL 기반
Neo4j 없이 `document_metrics` 테이블로 지표 중심 그래프를 구현. 인프라 복잡도를 줄이면서 문서 간 공통 지표 연결을 달성.

---

## 라이선스

MIT License
