# Troubleshooting Log

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
