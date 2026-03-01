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
