package com.intellidocs.domain.agent.tool;

import com.intellidocs.domain.agent.dto.ToolEvent;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResultData;
import com.intellidocs.domain.discrepancy.service.DiscrepancyService;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentQueryTools {

    private static final int SEARCH_LIMIT = 10;
    private static final int SUMMARIZE_LIMIT = 30;
    private static final int MAX_TEXT_LENGTH = 8000;

    private final HybridSearchService hybridSearchService;
    private final DiscrepancyService discrepancyService;
    private final DocumentRepository documentRepository;

    /**
     * Collects SearchResults from tool executions on the current thread.
     * Agent tool calls run synchronously on the calling thread,
     * so ThreadLocal is safe for capturing results per request.
     */
    private static final ThreadLocal<List<SearchResult>> COLLECTED_RESULTS = ThreadLocal.withInitial(ArrayList::new);

    private Consumer<ToolEvent> eventCallback;
    private final List<SearchResult> instanceCollectedResults = new ArrayList<>();
    private int discrepancyDetectionCount = 0;

    public void setEventCallback(Consumer<ToolEvent> callback) {
        this.eventCallback = callback;
    }

    /** Instance-level result access (for streaming - ThreadLocal doesn't work across threads). */
    public List<SearchResult> getInstanceCollectedResults() {
        return List.copyOf(instanceCollectedResults);
    }

    private void emitEvent(ToolEvent event) {
        if (eventCallback != null) {
            eventCallback.accept(event);
        }
    }

    public int getDiscrepancyDetectionCount() {
        return discrepancyDetectionCount;
    }

    /** Call before agent.chat() to reset collected results. */
    public void clearCollectedResults() {
        COLLECTED_RESULTS.get().clear();
        discrepancyDetectionCount = 0;
    }

    /** Call after agent.chat() to retrieve all search results from this request. */
    public List<SearchResult> getCollectedResults() {
        return List.copyOf(COLLECTED_RESULTS.get());
    }

    @Tool("사용자 문서에서 키워드/의미 기반으로 관련 내용을 검색한다. 일반적인 질문에 사용")
    public String searchDocuments(
            String query,
            @P(value = "특정 문서 UUID 목록 (예: '550e8400-e29b-41d4-a716-446655440000'). 파일명이 아닌 UUID를 사용해야 한다. null이면 전체 문서 대상", required = false) List<String> documentIds) {

        log.debug("searchDocuments called: query='{}', documentIds={}", query, documentIds);
        emitEvent(ToolEvent.start("searchDocuments", "문서 검색 중..."));

        SearchRequest request = SearchRequest.builder()
                .query(query)
                .filters(buildFilters(documentIds))
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            emitEvent(ToolEvent.end("searchDocuments", "검색 결과 없음"));
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        collectResults(response.getResults());
        String formatted = formatResults(response.getResults());
        log.info("[searchDocuments] query='{}', resultCount={}, formattedLength={}",
                query, response.getResults().size(), formatted.length());
        for (int i = 0; i < Math.min(response.getResults().size(), 3); i++) {
            SearchResult r = response.getResults().get(i);
            String textPreview = r.getText() != null
                    ? r.getText().substring(0, Math.min(r.getText().length(), 200))
                    : "<NULL>";
            log.info("[searchDocuments] result[{}]: file='{}', page={}, type={}, score={}, text='{}'",
                    i, r.getFilename(), r.getPageNumber(), r.getChunkType(), r.getScore(), textPreview);
        }
        emitEvent(ToolEvent.end("searchDocuments", response.getResults().size() + "개 관련 청크 발견"));
        return truncate(formatted);
    }

    @Tool("특정 문서의 전체 내용을 요약한다. 문서 요약 요청 시 사용. documentId는 UUID 형식이어야 한다")
    public String summarizeDocument(String documentId) {
        log.debug("summarizeDocument called: documentId='{}'", documentId);
        emitEvent(ToolEvent.start("summarizeDocument", "문서 요약 데이터 수집 중..."));

        SearchRequest request = SearchRequest.builder()
                .query("문서 전체 내용 요약")
                .filters(buildFilters(List.of(documentId)))
                .limit(SUMMARIZE_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            emitEvent(ToolEvent.end("summarizeDocument", "검색 결과 없음"));
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        collectResults(response.getResults());
        emitEvent(ToolEvent.end("summarizeDocument", response.getResults().size() + "개 청크 수집 완료"));
        return truncate(formatResults(response.getResults()));
    }

    @Tool("두 문서의 특정 항목을 비교 분석한다. 비교 질문 시 사용. docId1, docId2는 UUID 형식이어야 한다")
    public String compareDocuments(String docId1, String docId2, String aspect) {
        log.debug("compareDocuments called: docId1='{}', docId2='{}', aspect='{}'", docId1, docId2, aspect);
        emitEvent(ToolEvent.start("compareDocuments", "두 문서 비교 분석 중..."));

        String doc1Results = searchForDocument(docId1, aspect);
        String doc2Results = searchForDocument(docId2, aspect);

        String result = "[비교 분석: " + aspect + "]\n\n"
                + "=== 문서 1 ===\n" + doc1Results + "\n\n"
                + "=== 문서 2 ===\n" + doc2Results;

        emitEvent(ToolEvent.end("compareDocuments", "비교 데이터 수집 완료"));
        return truncate(result);
    }

    @Tool("여러 문서에서 특정 데이터를 추출해 표로 정리한다. 정리/추출 요청 시 사용. documentIds는 문서의 UUID를 사용하라")
    public String extractAndCompile(
            List<String> documentIds,
            String dataType,
            String outputFormat) {

        log.debug("extractAndCompile called: documentIds={}, dataType='{}', outputFormat='{}'",
                documentIds, dataType, outputFormat);
        emitEvent(ToolEvent.start("extractAndCompile", "데이터 추출 중..."));

        SearchRequest request = SearchRequest.builder()
                .query(dataType)
                .filters(buildFilters(documentIds))
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            emitEvent(ToolEvent.end("extractAndCompile", "검색 결과 없음"));
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        collectResults(response.getResults());
        emitEvent(ToolEvent.end("extractAndCompile", response.getResults().size() + "개 데이터 추출 완료"));
        return truncate(formatResults(response.getResults()));
    }

    @Tool("여러 문서에서 동일 항목의 수치 불일치를 탐지한다. " +
          "같은 항목이 문서마다 다른 수치로 기록된 경우를 찾아 알려준다.")
    public String detectDiscrepancies(
            @P(value = "비교할 문서 ID 목록 (UUID). null이면 전체 INDEXED 문서 대상", required = false) List<String> documentIds,
            @P(value = "검사할 항목 목록. null이면 자동 탐지", required = false) List<String> targetFields) {

        log.debug("detectDiscrepancies called: documentIds={}, targetFields={}", documentIds, targetFields);
        emitEvent(ToolEvent.start("detectDiscrepancies", "불일치 탐지 중..."));

        try {
            // documentIds가 없으면 전체 INDEXED 문서 상위 10개
            List<UUID> uuids;
            if (documentIds == null || documentIds.isEmpty()) {
                List<Document> indexed = documentRepository.findByStatusOrderByCreatedAtDesc(DocumentStatus.INDEXED);
                uuids = indexed.stream()
                        .limit(10)
                        .map(Document::getId)
                        .collect(Collectors.toList());
            } else {
                uuids = documentIds.stream()
                        .filter(id -> {
                            try { UUID.fromString(id); return true; }
                            catch (IllegalArgumentException e) {
                                log.warn("Invalid UUID skipped: '{}'", id);
                                return false;
                            }
                        })
                        .map(UUID::fromString)
                        .collect(Collectors.toList());
            }

            if (uuids.size() < 2) {
                emitEvent(ToolEvent.end("detectDiscrepancies", "비교 가능한 문서 부족"));
                return "비교 가능한 INDEXED 문서가 2개 미만입니다.";
            }

            DiscrepancyResultData data = discrepancyService.detectSync(uuids, targetFields, 0.001);
            discrepancyDetectionCount++;
            String formatted = formatDiscrepancyResult(data);

            emitEvent(ToolEvent.end("detectDiscrepancies",
                    (data.getDiscrepancies() != null ? data.getDiscrepancies().size() : 0) + "건 불일치 발견"));
            return truncate(formatted);

        } catch (Exception e) {
            log.error("detectDiscrepancies failed", e);
            emitEvent(ToolEvent.end("detectDiscrepancies", "탐지 실패"));
            return "불일치 탐지 중 오류가 발생했습니다: " + e.getMessage();
        }
    }

    // ── Private helpers ──────────────────────────────────────────

    private SearchRequest.Filters buildFilters(List<String> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return null;
        }

        List<UUID> uuids = documentIds.stream()
                .filter(id -> {
                    try {
                        UUID.fromString(id);
                        return true;
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid UUID skipped (LLM may have passed a filename): '{}'", id);
                        return false;
                    }
                })
                .map(UUID::fromString)
                .collect(Collectors.toList());

        if (uuids.isEmpty()) {
            return null; // fall back to searching all documents
        }

        return SearchRequest.Filters.builder()
                .documentIds(uuids)
                .build();
    }

    private String formatResults(List<SearchResult> results) {
        StringBuilder sb = new StringBuilder();
        for (SearchResult result : results) {
            sb.append("[출처: ").append(result.getFilename());
            if (result.getPageNumber() != null) {
                sb.append(", p.").append(result.getPageNumber());
            }
            if (result.getDocumentId() != null) {
                sb.append(" | docId=").append(result.getDocumentId());
            }
            sb.append("]\n");
            if ("TABLE".equalsIgnoreCase(result.getChunkType())) {
                sb.append("[표 데이터 — 아래 수치를 답변 표에 반드시 사용하세요]\n");
            }
            sb.append(result.getText());
            sb.append("\n\n");
        }
        return sb.toString().trim();
    }

    private String searchForDocument(String documentId, String query) {
        SearchRequest request = SearchRequest.builder()
                .query(query)
                .filters(buildFilters(List.of(documentId)))
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            return "검색 결과가 없습니다.";
        }

        collectResults(response.getResults());
        return formatResults(response.getResults());
    }

    private String formatDiscrepancyResult(DiscrepancyResultData data) {
        if (data.getDiscrepancies() == null || data.getDiscrepancies().isEmpty()) {
            int checked = data.getSummary() != null ? data.getSummary().getTotalFieldsChecked() : 0;
            return "검사한 항목 " + checked + "개에서 불일치가 발견되지 않았습니다.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("## 불일치 탐지 결과\n\n");
        sb.append("| 항목 | 기간 | 심각도 | 차이 |\n");
        sb.append("|------|------|--------|------|\n");

        for (DiscrepancyResultData.Discrepancy d : data.getDiscrepancies()) {
            sb.append("| ").append(d.getField())
              .append(" | ").append(d.getPeriod() != null ? d.getPeriod() : "-")
              .append(" | ").append(d.getSeverity())
              .append(" | ").append(d.getDifference())
              .append(" |\n");
        }

        sb.append("\n### 상세 내역\n\n");
        for (DiscrepancyResultData.Discrepancy d : data.getDiscrepancies()) {
            sb.append("**").append(d.getField());
            if (d.getPeriod() != null) sb.append(" (").append(d.getPeriod()).append(")");
            sb.append("** — ").append(d.getDifference()).append("\n");
            for (DiscrepancyResultData.Entry e : d.getEntries()) {
                sb.append("  - ").append(e.getFilename()).append(": ").append(e.getValue()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("**검사 항목**: ").append(data.getSummary().getTotalFieldsChecked()).append("개, ");
        sb.append("**불일치**: ").append(data.getSummary().getDiscrepanciesFound()).append("건\n");

        return sb.toString();
    }

    private void collectResults(List<SearchResult> results) {
        COLLECTED_RESULTS.get().addAll(results);
        instanceCollectedResults.addAll(results);
    }

    private String truncate(String text) {
        if (text.length() <= MAX_TEXT_LENGTH) {
            return text;
        }
        return text.substring(0, MAX_TEXT_LENGTH) + "\n... (결과가 잘렸습니다)";
    }
}
