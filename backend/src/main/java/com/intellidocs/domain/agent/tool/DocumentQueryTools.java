package com.intellidocs.domain.agent.tool;

import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentQueryTools {

    private static final int SEARCH_LIMIT = 10;
    private static final int SUMMARIZE_LIMIT = 30;
    private static final int MAX_TEXT_LENGTH = 8000;

    private final HybridSearchService hybridSearchService;

    @Tool("사용자 문서에서 키워드/의미 기반으로 관련 내용을 검색한다. 일반적인 질문에 사용")
    public String searchDocuments(
            String query,
            @P(value = "특정 문서 ID 목록, null이면 전체 문서 대상", required = false) List<String> documentIds) {

        log.debug("searchDocuments called: query='{}', documentIds={}", query, documentIds);

        SearchRequest request = SearchRequest.builder()
                .query(query)
                .filters(buildFilters(documentIds))
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        return truncate(formatResults(response.getResults()));
    }

    @Tool("특정 문서의 전체 내용을 요약한다. 문서 요약 요청 시 사용")
    public String summarizeDocument(String documentId) {
        log.debug("summarizeDocument called: documentId='{}'", documentId);

        SearchRequest request = SearchRequest.builder()
                .query("문서 전체 내용 요약")
                .filters(buildFilters(List.of(documentId)))
                .limit(SUMMARIZE_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        return truncate(formatResults(response.getResults()));
    }

    @Tool("두 문서의 특정 항목을 비교 분석한다. 비교 질문 시 사용")
    public String compareDocuments(String docId1, String docId2, String aspect) {
        log.debug("compareDocuments called: docId1='{}', docId2='{}', aspect='{}'", docId1, docId2, aspect);

        String doc1Results = searchForDocument(docId1, aspect);
        String doc2Results = searchForDocument(docId2, aspect);

        String result = "[비교 분석: " + aspect + "]\n\n"
                + "=== 문서 1 ===\n" + doc1Results + "\n\n"
                + "=== 문서 2 ===\n" + doc2Results;

        return truncate(result);
    }

    @Tool("여러 문서에서 특정 데이터를 추출해 표로 정리한다. 정리/추출 요청 시 사용")
    public String extractAndCompile(
            List<String> documentIds,
            String dataType,
            String outputFormat) {

        log.debug("extractAndCompile called: documentIds={}, dataType='{}', outputFormat='{}'",
                documentIds, dataType, outputFormat);

        SearchRequest request = SearchRequest.builder()
                .query(dataType)
                .filters(buildFilters(documentIds))
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse response = hybridSearchService.search(request);

        if (response.getResults() == null || response.getResults().isEmpty()) {
            return "검색 결과가 없습니다. 다른 키워드로 시도해 주세요.";
        }

        return truncate(formatResults(response.getResults()));
    }

    // ── Private helpers ──────────────────────────────────────────

    private SearchRequest.Filters buildFilters(List<String> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return null;
        }

        List<UUID> uuids = documentIds.stream()
                .map(UUID::fromString)
                .collect(Collectors.toList());

        return SearchRequest.Filters.builder()
                .documentIds(uuids)
                .build();
    }

    private String formatResults(List<SearchResult> results) {
        StringBuilder sb = new StringBuilder();
        for (SearchResult result : results) {
            sb.append("[출처: ").append(result.getFilename());
            if (result.getPageNumber() != null) {
                sb.append(", 페이지 ").append(result.getPageNumber());
            }
            sb.append("]\n");
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

        return formatResults(response.getResults());
    }

    private String truncate(String text) {
        if (text.length() <= MAX_TEXT_LENGTH) {
            return text;
        }
        return text.substring(0, MAX_TEXT_LENGTH) + "\n... (결과가 잘렸습니다)";
    }
}
