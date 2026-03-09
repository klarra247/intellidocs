# Troubleshooting Log

---

### [2026-03-04] @Async self-invocation으로 리포트 생성이 동기 실행됨
- **문제**: `POST /api/v1/reports/generate` 호출 시 `AsyncRequestTimeoutException` + `NullPointerException` 발생. SSE emitter가 타임아웃되고, 리포트 생성이 비동기로 실행되지 않음
- **원인**: `ReportService.createReport()`에서 같은 클래스의 `@Async generateAsync()`를 직접 호출하면 Spring AOP 프록시를 우회하여 동기 실행됨. POST 요청이 LLM 호출 완료까지 블록되어 SSE 구독이 불가능
- **해결**: `@Async` 메서드를 별도 빈 `ReportAsyncExecutor`로 분리. `createReport()` → `asyncExecutor.execute()` (cross-bean call) → `reportService.generateReport()` 구조로 변경. 순환 의존은 `@Lazy`로 해결
- **검증**: `./gradlew build -x test` 성공
- **교훈**: Spring `@Async`는 반드시 다른 빈에서 호출해야 프록시를 경유한 비동기 실행이 보장됨. 같은 클래스 내부 호출(`this.method()`)은 프록시를 우회함

---

### [2026-03-03] SSE 이벤트가 프론트엔드에 도달하지 않음 — Next.js rewrites 프록시가 SSE 미지원
- **문제**: 백엔드 파이프라인은 정상 완료(Qdrant/ES 인덱싱 성공)되지만 프론트 프로그레스가 10%에서 멈추고, Next.js 콘솔에 `Failed to proxy ... Error: socket hang up (ECONNRESET)` 출력
- **원인**: `next.config.js`의 `rewrites`가 프록시하는 `http-proxy`는 일반 request-response용이며, SSE처럼 장시간 열려있는 스트리밍 연결을 제대로 중계하지 못함. 응답을 버퍼링하거나 연결을 끊어서 백엔드가 보낸 SSE 이벤트가 클라이언트까지 전달되지 않음
- **해결**: `lib/sse.ts`에서 SSE/스트리밍 연결만 `NEXT_PUBLIC_API_URL` (기본값 `http://localhost:8080/api/v1`)을 사용하여 Next.js 프록시를 우회, 백엔드에 직접 연결. 일반 REST API 호출은 기존대로 rewrites 프록시 사용
- **검증**: `npm run build` 성공
- **교훈**: Next.js rewrites는 SSE/WebSocket 등 장시간 스트리밍 연결에 적합하지 않음. 스트리밍 엔드포인트는 별도 URL로 직접 연결해야 함

---

### [2026-03-02] 문서 파이프라인 10%에서 멈춤 — 임베딩 API hang + @Transactional 블로킹
- **문제**: 문서 업로드 후 청크 저장(INSERT/UPDATE)까지는 되지만 이후 로그가 안 넘어가고 프론트 프로그레스가 10%에서 멈춤
- **원인**: 두 가지 문제의 복합
  1. `EmbeddingService`의 `RestClient`에 타임아웃 미설정 → OpenAI API가 응답 안 하면 무한 대기
  2. `ParseResultListener.handleParseResult()`가 `@Transactional`로 전체 메서드를 감싸고 있어, 임베딩 API hang 시 DB 커넥션을 계속 점유하고 RabbitMQ 리스너 스레드도 블로킹
- **해결**:
  - `EmbeddingService`: RestClient에 connectTimeout 10초, readTimeout 30초 설정
  - `ParseResultListener`: `@Transactional` 제거, DB 작업을 별도 `ParseResultPersistenceService`로 분리
    - Phase 1 (트랜잭션): 청크 저장 + 상태 변경 → 빠르게 커밋
    - Phase 2 (트랜잭션 없음): 외부 API 호출 (임베딩/Qdrant/ES)
    - Phase 3 (트랜잭션): 완료 상태 커밋
- **검증**: `./gradlew build -x test` 성공
- **교훈**: 외부 API 호출을 DB 트랜잭션 안에 넣지 말 것. RabbitMQ 리스너에서 `@Transactional`은 DB 작업에만 한정해야 함

---

### [2026-03-02] 프론트엔드 SSE 연결 실패 — Invalid UUID string: undefined
- **문제**: 문서 업로드 후 SSE 상태 구독에서 `Invalid UUID string: undefined` 에러 발생. 업로드 프로그레스는 "실패"로 표시되지만, 문서 카드의 상태 배지는 "파싱 중"으로 계속 멈춤
- **원인**: 프론트엔드 `Document` 타입이 `id` 필드를 기대하지만, 백엔드 `DocumentDto.UploadResponse`는 `documentId`를 반환. `doc.id`가 `undefined`가 되어 SSE URL이 `/documents/undefined/status`로 요청됨. 추가로 `ListResponse`는 `originalFilename`을 쓰지만 프론트는 `filename`을 기대, `ApiResponse.error`도 문자열이 아닌 `ErrorInfo { code, message }` 객체
- **해결**:
  - `lib/types.ts`: `UploadResponse` 타입 분리 (`documentId` 필드), `Document` 타입을 `ListResponse` 구조에 맞춤 (`originalFilename`), `ApiResponse.error`를 `{ code, message } | null`로 수정
  - `lib/api.ts`: upload이 `UploadResponse`를 반환하도록 변경, 에러 파싱 로직 수정
  - `stores/documentStore.ts`: `uploadRes.documentId`로 SSE 구독, 업로드 직후 `fetchDocuments()`로 목록 동기화
  - `DocumentCard.tsx`, `DocumentList.tsx`: `originalFilename` 사용
- **검증**: `npm run build` 성공
- **교훈**: 프론트/백 타입 정의 시 실제 백엔드 DTO 클래스의 필드명을 확인할 것. 특히 `id` vs `documentId` 같은 네이밍 불일치 주의

---

### [2026-03-02] 종합 재무 분석 시 LLM이 4관점 중 1개만 답변하는 문제

- **문제**: "최근 3년간 재무 건전성을 분석해줘" 질문 시 성장성 관점만 언급하고 수익성/안정성/효율성은 무시. 답변 454자로 짧음
- **원인**: `FINANCIAL_FRAMEWORK`가 4관점(수익성, 안정성, 성장성, 효율성)을 나열만 하고 "종합 분석 시 여러 관점을 다뤄라"는 명시적 지시가 없음. LLM이 가장 직접적인 관점 하나만 선택
- **해결**: `FINANCIAL_FRAMEWORK`에 `"종합 재무 분석이나 재무 건전성 질문 시 위 4개 관점 중 검색 결과에서 데이터를 찾을 수 있는 관점은 모두 다루어라."` 지시 추가
- **검증**: `./gradlew test` 통과 + E2E 테스트에서 2개 이상 관점 매칭 확인
- **교훈**: 프롬프트에 프레임워크를 나열하는 것만으로는 LLM이 종합적으로 활용하지 않음. "모두 다루어라" 같은 명시적 행동 지시가 필요

---

### [2026-03-02] E2E 테스트 스크립트가 세션/히스토리 테스트에서 멈추거나 404 반환

- **문제 1**: [8/10] 대화 이어가기 테스트에서 스크립트가 멈추고 종료됨
- **문제 2**: [10/10] 히스토리 조회 시 404 — `ChatSession not found`
- **원인 1**: `set -euo pipefail` 설정 + `json_str("sessionId")` 호출 시 동기 응답에 `sessionId` 필드가 없음 → `grep` exit code 1 → `pipefail`로 파이프 실패 → 스크립트 즉시 종료
- **원인 2**: 동기 `AgentService.chat()`은 `chatHistoryService.persistConversation()`을 호출하지 않음. 스트리밍 `StreamingAgentService`만 히스토리를 persist. 동기 호출에서 생성한 sessionId는 DB에 없어서 404
- **해결**:
  - `set -euo pipefail` 제거 (Phase 1/2와 동일 방식 — JSON 파싱 실패는 정상 흐름)
  - [8/10]을 SSE 스트리밍 엔드포인트(`/chat/stream`)로 전환. `agent_chat_stream()`, `stream_get_answer()`, `stream_get_session_id()` 헬퍼 추가
  - 스트리밍 done 이벤트에서 서버가 생성한 `sessionId`를 추출하여 [10/10]에서 사용
- **검증**: 스크립트 구문 검사 통과 (`bash -n`)
- **교훈**: 테스트 스크립트에서 `set -euo pipefail`은 JSON 파싱 헬퍼와 상충함. 또한 히스토리 관련 테스트는 실제로 persist하는 엔드포인트(스트리밍)를 사용해야 함

---

### [2026-03-02] LLM이 Tool에 파일명을 UUID 대신 전달하는 문제

- **문제**: `extractAndCompile` 호출 시 LLM이 `documentIds`에 `"테크스타_2024_사업보고서.pdf"` 같은 파일명을 전달 → `UUID.fromString()` 에서 `IllegalArgumentException` 발생
- **원인**: Tool 설명에 "UUID 형식"이라는 안내 없음 + `searchDocuments` 결과에 documentId(UUID)가 노출되지 않아 LLM이 파일명을 ID로 착각
- **해결**:
  - Tool `@Tool` 설명에 "documentIds는 UUID 형식, 파일명이 아님" 명시, `extractAndCompile`에는 "UUID를 모르면 먼저 searchDocuments로 검색하라" 안내 추가
  - `formatResults()`에 `(docId: UUID)` 포함하여 LLM이 후속 도구 호출 시 UUID 참조 가능
  - `buildFilters()`에서 UUID 파싱 실패 시 해당 항목 skip + 전부 실패 시 `null` 반환 (전체 문서 대상 fallback)
- **검증**: `./gradlew clean build` 전체 통과 (83 tests)
- **교훈**: LLM은 도구 설명을 글자 그대로 따르므로, 파라미터 형식/제약 조건을 명확히 기술해야 함. 검색 결과 포맷에 ID를 노출해야 후속 도구 호출이 정확해짐

---

### [2026-03-02] Agent 답변 품질 개선 (프롬프트/Confidence/출처/테이블 추출)

- **문제**: Agent 답변의 재무 분석 깊이 부족, 출처에 중복 페이지 노출, Confidence가 전체 결과 평균이라 노이즈 포함, 마크다운 테이블이 구조화되지 않음
- **원인**: System Prompt가 간결하여 재무 프레임워크·수치 규칙 부재, `computeConfidence`가 전체 평균 사용, `deduplicateSources`가 (docId, page) 키로 중복 제거하여 같은 문서가 여러 건, 테이블 후처리 없음
- **해결**:
  - `AgentPrompts`: SYSTEM_MESSAGE를 ROLE_AND_RULES / NUMERIC_RULES / FINANCIAL_FRAMEWORK / OUTPUT_FORMAT / TOOL_GUIDE 섹션으로 분리
  - `SearchResultUtils.computeConfidence`: 전체 평균 → top-3 평균으로 변경, `computeConfidenceLevel` (HIGH/MEDIUM/LOW/VERY_LOW) 추가
  - `SearchResultUtils.deduplicateSources`: documentId 단위 그룹화 + pageRange 문자열 병합 (예: "p.1-3,7")
  - `SourceInfo.pageRange`, `AgentResponse.confidenceLevel`, `AgentResponse.tableData` 필드 추가
  - `AgentRequest.question`에 `@Size(max=2000)` 검증 + 서비스 레이어 truncation
  - `AnswerPostProcessor.extractTables`: 정규식으로 마크다운 테이블 → `TableData(headers, rows)` best-effort 추출
  - `AgentService`: LLM 호출 1회 재시도, confidenceLevel/tableData 응답에 포함
  - `StreamingAgentService`: sources SSE에 confidenceLevel 추가, done SSE에 tableData 추가
- **검증**: `./gradlew clean build` 전체 통과 (기존 + 신규 테스트 포함)
- **교훈**: Confidence 계산 시 전체 평균은 노이즈에 취약 — top-K 평균이 실질적 신뢰도를 반영. 후처리(테이블 추출)는 best-effort로 설계하여 실패해도 핵심 답변에 영향 없도록

---

### [2026-03-02] Excel 수식 셀 값이 빈 문자열로 파싱되는 문제

- **문제**: openpyxl `data_only=True`로 Excel 파일을 읽을 때, `=SUM(B2:B10)` 같은 수식 셀이 `None`으로 반환되어 합계 행이 누락됨
- **원인**: `data_only=True`는 Excel이 마지막 저장 시 캐시한 값을 읽는 옵션. Python/API로 생성되어 한 번도 Excel 앱에서 열지 않은 파일에는 캐시가 없음
- **해결**: 3단계 fallback 전략 도입
  - 1순위: openpyxl `data_only=True` 캐시값
  - 2순위: `formulas` 라이브러리(`formulas==1.3.3`)로 수식 직접 계산
  - 3순위: 수식 문자열을 `[수식]=SUM(...)` 형태로 보존
  - `numpy.ndarray` 중첩 결과(`[[540]]`)를 스칼라로 추출하는 처리, 부동소수점 노이즈 제거(`_format_value`) 추가
- **검증**: 수식 셀(합계, 평균 등)이 정확한 수치로 파싱되어 RAG 검색 결과에 포함됨 확인
- **교훈**: 라이브러리 옵션명을 맹신하지 말 것. `data_only`는 "수식 실행"이 아니라 "캐시 읽기". Graceful degradation 설계 필수

---

### [2026-03-02] PDF 테두리 없는 표가 감지되지 않는 문제

- **문제**: 한국 재무제표 PDF에서 borderless 표가 일반 텍스트로 파싱되어 표 구조 손실
- **원인**: pdfplumber 기본 `find_tables()`는 lines 기반 전략으로, 테두리 선이 없는 표를 감지하지 못함
- **해결**: 3가지 개선
  - 2단계 표 감지: 기본(lines) 실패 시 text 기반 전략(`vertical_strategy="text"`)으로 재시도
  - `_clean_table()`: 전체 비어있는 열/행 제거로 파싱 품질 개선
  - `_extract_text_from_bbox()`: 표 추출 실패 또는 빈 셀 70% 이상 시, 해당 bbox 영역에서 PyMuPDF로 원문 텍스트 추출 (fallback)
- **검증**: borderless 재무제표 표가 `is_table=True` 구조화 청크로 정상 파싱됨
- **교훈**: 실제 도메인 문서(한국 재무제표)로 테스트할 것. 파싱 실패 ≠ 데이터 없음 — 구조화 실패 시 비구조화 데이터라도 보존

---

### [2026-03-02] 단순 RAG → LangChain4j Agent 전환

- **문제**: 단순 RAG는 항상 "검색→답변" 고정 흐름이라 증감률 계산, 문서 비교, 요약 등 다양한 질문 유형을 처리할 수 없음. LLM이 직접 계산하면 수치 오류 발생
- **원인**: `RagService`가 모든 질문에 대해 동일한 파이프라인(HybridSearch → Context 구성 → LLM 호출)을 실행하는 단일 경로 구조
- **해결**: LangChain4j `AiServices` + `@Tool` 어노테이션으로 Agent 패턴 구현
  - `DocumentQueryTools`: 검색, 요약, 비교, 추출 (4개 Tool)
  - `FinancialCalculatorTools`: 증감률, 재무비율, 추세분석 (3개 Tool) — LLM 대신 코드가 정확하게 계산
  - `IntelliDocsAgent` 인터페이스: `@SystemMessage`로 Agent 역할/Tool 선택 기준 지정
  - `AgentService`: `AiServices.builder()`로 Agent 구성, `MessageWindowChatMemory`(세션당 10개 메시지)로 대화 맥락 유지
  - `AgentController`가 `AgentService`를 사용하도록 전환
- **검증**: FinancialCalculatorTools 16건, DocumentQueryTools 6건, AgentService 4건, AgentController 3건 — 총 29건 테스트 통과. `./gradlew clean build` 성공
- **교훈**: `@Tool` description이 LLM의 도구 선택 정확도를 결정하므로, 한국어로 구체적인 사용 시나리오를 명시해야 함. 수치 계산은 LLM에 맡기지 말고 전용 Tool로 분리할 것

---

### [2026-03-02] AgentResponse의 sources/confidence가 항상 비어있는 문제

- **문제**: Agent가 Tool을 통해 문서를 검색하고 답변 텍스트 안에 "(출처: 파일명, 페이지)"를 포함하지만, `AgentResponse.sources` 배열은 항상 `[]`, `confidence`는 항상 `0.0`으로 반환됨
- **원인**: `DocumentQueryTools`의 `@Tool` 메서드가 `HybridSearchService.search()`로 `SearchResult`(출처, 점수 포함)를 얻지만 LLM에게는 포맷팅된 `String`만 반환. 메타데이터가 `AgentService`까지 전달되지 않는 구조
- **해결**: `ThreadLocal<List<SearchResult>>`를 사용한 사이드채널 패턴
  - `DocumentQueryTools`에 `COLLECTED_RESULTS` ThreadLocal 추가
  - 각 `@Tool` 메서드에서 검색 결과를 `collectResults()`로 수집
  - `AgentService.chat()`에서 `clearCollectedResults()` → `agent.chat()` → `getCollectedResults()`
  - 수집된 결과로 `deduplicateSources()`(LinkedHashMap으로 documentId:pageNumber 중복 제거) + `computeConfidence()`(RRF 평균 점수 × 60 정규화) 수행
  - LangChain4j Agent의 tool 실행이 동일 스레드에서 동기적이므로 ThreadLocal이 안전
- **검증**: DocumentQueryToolsTest에 수집/초기화 테스트 2건, AgentServiceTest에 sources/confidence 검증 테스트 2건 추가. 전체 빌드 통과
- **교훈**: Agent 프레임워크가 tool의 반환값을 String으로 추상화하면 메타데이터가 유실된다. 프레임워크 외부의 사이드채널(ThreadLocal 등)로 구조화된 데이터를 별도 전달해야 함

---

### [2026-03-02] SSE 스트리밍 응답 + 대화 히스토리 구현

- **문제**: Agent 응답이 전체 완성 후 한 번에 전달되어 사용자 체감 대기 시간이 길고, 대화 히스토리가 저장되지 않아 새로고침 시 이전 대화가 사라짐
- **원인**: `AgentService`가 동기식 `ChatLanguageModel.chat()`을 사용하여 전체 응답 생성 완료까지 블로킹. `ChatSession`/`ChatMessage` 엔티티는 존재하나 Agent 흐름에서 저장 로직 미구현
- **해결**: LangChain4j `StreamingChatLanguageModel` + Spring `SseEmitter`로 토큰 단위 스트리밍 구현
  - `StreamingAgentService`: 요청당 신규 Tool 인스턴스 생성 (스트리밍 콜백이 I/O 스레드에서 실행되므로 ThreadLocal 사용 불가)
  - SSE 이벤트 시퀀스: `tool_start` → `tool_end` → `token`(반복) → `sources` → `done`
  - `@Tool` 메서드에 `Consumer<ToolEvent>` 콜백 패턴 추가 — tool_start/tool_end 이벤트 발생
  - `ConcurrentHashMap<Object, ChatMemory>` 공유 메모리 스토어로 세션 간 대화 맥락 유지
  - `ChatHistoryService`: 스트리밍 완료 후 `onCompleteResponse`에서 user/assistant 메시지 + sources를 DB에 저장
  - `GET /api/v1/agent/chat/history?sessionId={id}`로 대화 히스토리 조회
- **검증**: StreamingAgentServiceTest 3건, ChatHistoryServiceTest 6건, AgentControllerTest 2건 추가. `./gradlew clean build` 성공 (총 테스트 전량 통과)
- **교훈**: 스트리밍 환경에서 ThreadLocal은 위험하다 — 콜백이 다른 스레드에서 실행될 수 있으므로, 요청당 인스턴스 + 인스턴스 레벨 컬렉션으로 전환해야 함. 기존 동기식 경로(AgentService)는 ThreadLocal이 여전히 안전하므로 두 패턴을 공존시킴

---

### [2026-03-02] SSE 스트리밍 완료 후 ChatSession/ChatMessage가 DB에 저장되지 않는 문제

- **문제**: `/agent/chat/stream` 호출 시 `event:done`까지 정상 출력되지만, 이후 `/agent/chat/history?sessionId={id}` 조회하면 "ChatSession not found" 반환
- **원인**: `ChatSession` 엔티티가 `@GeneratedValue(strategy = GenerationType.UUID)`를 사용하는데, `createSession(UUID sessionId)`에서 수동으로 ID를 설정함. Spring Data의 `save()`가 non-null ID를 보고 `isNew()=false` 판단 → `em.persist()` 대신 `em.merge()` 호출 → Hibernate가 SELECT 후 새 UUID를 재생성하거나 예외 발생. 예외는 `onCompleteResponse`의 `catch (Exception e)`에서 묵인되고, 실제 DB에 존재하지 않는 `memoryId`가 fallback sessionId로 `done` 이벤트에 포함됨
- **해결**: 3가지 수정
  - `createSession()`에서 ID를 수동 설정하지 않음 — 항상 `@GeneratedValue`가 생성하도록 위임
  - `persistConversation()` 단일 `@Transactional` 메서드 추가 — 세션 생성/메시지 저장/제목 갱신을 하나의 트랜잭션으로 묶어 detached entity 문제 방지
  - `response.aiMessage()` null 방어 처리, DB에 저장되지 않은 가짜 sessionId fallback 제거
- **검증**: ChatHistoryServiceTest 10건 (persistConversation 포함), 전체 59건 테스트 통과. `./gradlew clean build` 성공
- **교훈**: `@GeneratedValue` 엔티티에 ID를 수동 설정하면 JPA가 `merge()`를 호출하여 의도와 다른 동작 발생. ID 생성 전략이 있는 엔티티는 반드시 프레임워크에 위임할 것. 예외 묵인(`catch` 후 fallback) 패턴은 디버깅을 매우 어렵게 만드므로, 최소한 로그 레벨을 높이거나 메트릭을 남길 것

---

### [2026-03-04] @Async + SSE 타이밍: 비동기 작업이 클라이언트 SSE 연결 전에 완료됨
- **문제**: 불일치 탐지에서 `targetFields`를 지정하면 Stage 1(항목 식별) 스킵 + 검색 캐시 히트로 ~5초 만에 완료. 클라이언트가 POST 응답을 받고 SSE `/status`에 연결하기 전에 모든 이벤트가 발행되고 `complete()`까지 호출되어, SSE 응답이 빈 채로 멈춤
- **원인**: `SseEmitterService.send()`가 emitter 미등록 시 이벤트를 버림 (`if (emitter == null) return`). 비동기 작업이 빠르게 끝나면 emitter가 존재하지 않는 시점에 모든 이벤트가 소실
- **해결**: `DiscrepancySseEmitterService`에 이벤트 버퍼링 추가. `send()` — emitter 유무와 관계없이 항상 `CopyOnWriteArrayList` 버퍼에 저장. `createEmitter()` — 클라이언트 연결 시 버퍼된 이벤트 즉시 재생, 이미 완료된 작업이면 complete 호출. `complete()` — emitter 미등록 시 완료 플래그만 저장
- **검증**: `targetFields` 지정 요청 시 SSE에서 버퍼된 이벤트가 정상 수신됨
- **교훈**: `@Async` + SSE 패턴에서는 작업 완료 속도와 클라이언트 연결 타이밍을 보장할 수 없음. 이벤트 버퍼링은 필수. `ReportSseEmitterService`, `DocumentSseEmitterService`에도 동일 패턴 적용 검토 필요

---

### [2026-03-09] 코드 리뷰 기반 인프라/보안 개선 5건

- **문제 1 (CORS)**: `SecurityConfig`에서 `allowedOriginPatterns(List.of("*"))` + `allowCredentials(true)`로 설정되어, 모든 오리진에서 인증 쿠키/토큰 포함 요청 가능
- **문제 2 (검색 타임아웃)**: `HybridSearchService`의 `CompletableFuture.supplyAsync()`가 기본 ForkJoinPool을 사용하고 `.join()`에 타임아웃이 없어, Qdrant/ES 장애 시 무한 대기
- **문제 3 (@Async 스레드 풀)**: `@EnableAsync`만 선언하고 `AsyncConfigurer` 미구현으로 기본 `SimpleAsyncTaskExecutor` 사용. 요청마다 새 스레드 생성, 스레드 수 제한 없음
- **문제 4 (멱등성)**: `ParseResultListener`가 이미 INDEXED된 문서에 대해 재인덱싱 시도. Qdrant에 중복 벡터 적재 가능
- **문제 5 (메모리)**: `docker-compose.yml`에 postgres, redis, rabbitmq, parser, api, frontend, nginx 서비스의 메모리 제한 미설정. OOM 시 다른 컨테이너까지 영향
- **해결**:
  - CORS: `app.cors.allowed-origins` 설정 추가, `setAllowedOrigins()`로 변경. `CORS_ALLOWED_ORIGINS` 환경변수로 제어
  - 검색: `SearchExecutorConfig`로 전용 스레드 풀(core=2, max=4, queue=20) 생성, `.orTimeout(5, SECONDS)` + `.exceptionally()` graceful degradation
  - @Async: `AsyncConfig implements AsyncConfigurer` 추가, 바운드 풀(core=2, max=4, queue=20), `CallerRunsPolicy`, `AsyncUncaughtExceptionHandler` 로깅
  - 멱등성: document.status == INDEXED이면 early return + Qdrant `deleteByDocumentId()` 선행 호출로 중복 벡터 방지
  - Docker: 서비스별 메모리 제한 (postgres 512m, redis 300m, rabbitmq 512m, parser 512m, api 768m, frontend 256m, nginx 64m). 총 ~4.4GB, t3.large 8GB 기준 OS 여유 확보
- **검증**: `./gradlew build` 통과
- **교훈**: 프로덕션 배포 전 반드시 점검: CORS 와일드카드, 무바운드 스레드 풀, 타임아웃 미설정, 멱등성 미보장, 컨테이너 메모리 무제한. 특히 t3.large처럼 메모리가 제한된 환경에서는 Docker 메모리 제한이 필수
