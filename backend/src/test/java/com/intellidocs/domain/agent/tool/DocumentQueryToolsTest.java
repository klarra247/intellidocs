package com.intellidocs.domain.agent.tool;

import com.intellidocs.domain.agent.dto.ToolEvent;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentQueryToolsTest {

    @Mock
    private HybridSearchService hybridSearchService;

    private DocumentQueryTools documentQueryTools;

    @BeforeEach
    void setUp() {
        documentQueryTools = new DocumentQueryTools(hybridSearchService);
    }

    @Test
    void searchDocuments_returnsFormattedResults() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("chunk-1")
                .documentId(docId)
                .filename("report.pdf")
                .text("The revenue grew 20% YoY.")
                .pageNumber(3)
                .sectionTitle("Financial Summary")
                .score(0.9)
                .build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(chunk))
                .totalResults(1)
                .elapsedMs(50L)
                .vectorHits(1)
                .bm25Hits(1)
                .build();

        when(hybridSearchService.search(any())).thenReturn(response);

        String result = documentQueryTools.searchDocuments("revenue growth", null);

        assertThat(result).contains("report.pdf");
        assertThat(result).contains("The revenue grew 20% YoY.");
        assertThat(result).contains("p.3");
    }

    @Test
    void searchDocuments_withDocumentIds_passesFilters() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("chunk-1")
                .documentId(docId)
                .filename("report.pdf")
                .text("Some text")
                .pageNumber(1)
                .score(0.8)
                .build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(chunk))
                .totalResults(1)
                .elapsedMs(30L)
                .vectorHits(1)
                .bm25Hits(0)
                .build();

        when(hybridSearchService.search(any())).thenReturn(response);

        documentQueryTools.searchDocuments("query", List.of(docId.toString()));

        ArgumentCaptor<SearchRequest> captor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(hybridSearchService).search(captor.capture());

        SearchRequest captured = captor.getValue();
        assertThat(captured.getFilters()).isNotNull();
        assertThat(captured.getFilters().getDocumentIds()).containsExactly(docId);
    }

    @Test
    void searchDocuments_noResults_returnsNotFound() {
        SearchResponse emptyResponse = SearchResponse.builder()
                .results(List.of())
                .totalResults(0)
                .elapsedMs(10L)
                .vectorHits(0)
                .bm25Hits(0)
                .build();

        when(hybridSearchService.search(any())).thenReturn(emptyResponse);

        String result = documentQueryTools.searchDocuments("nonexistent query", null);

        assertThat(result).isEqualTo("검색 결과가 없습니다. 다른 키워드로 시도해 주세요.");
    }

    @Test
    void summarizeDocument_returnsAllChunks() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk1 = SearchResult.builder()
                .chunkId("c1")
                .documentId(docId)
                .filename("doc.pdf")
                .text("First chunk text.")
                .pageNumber(1)
                .sectionTitle("Introduction")
                .score(0.9)
                .build();

        SearchResult chunk2 = SearchResult.builder()
                .chunkId("c2")
                .documentId(docId)
                .filename("doc.pdf")
                .text("Second chunk text.")
                .pageNumber(2)
                .sectionTitle("Conclusion")
                .score(0.8)
                .build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(chunk1, chunk2))
                .totalResults(2)
                .elapsedMs(40L)
                .vectorHits(2)
                .bm25Hits(0)
                .build();

        when(hybridSearchService.search(any())).thenReturn(response);

        String result = documentQueryTools.summarizeDocument(docId.toString());

        assertThat(result).contains("First chunk text.");
        assertThat(result).contains("Second chunk text.");
    }

    @Test
    void compareDocuments_returnsBothDocResults() {
        UUID docId1 = UUID.randomUUID();
        UUID docId2 = UUID.randomUUID();

        SearchResult chunk1 = SearchResult.builder()
                .chunkId("c1")
                .documentId(docId1)
                .filename("doc1.pdf")
                .text("Document 1 content about pricing.")
                .pageNumber(1)
                .score(0.9)
                .build();

        SearchResult chunk2 = SearchResult.builder()
                .chunkId("c2")
                .documentId(docId2)
                .filename("doc2.pdf")
                .text("Document 2 content about pricing.")
                .pageNumber(5)
                .score(0.85)
                .build();

        SearchResponse response1 = SearchResponse.builder()
                .results(List.of(chunk1))
                .totalResults(1)
                .elapsedMs(20L)
                .vectorHits(1)
                .bm25Hits(0)
                .build();

        SearchResponse response2 = SearchResponse.builder()
                .results(List.of(chunk2))
                .totalResults(1)
                .elapsedMs(25L)
                .vectorHits(1)
                .bm25Hits(0)
                .build();

        when(hybridSearchService.search(any()))
                .thenReturn(response1)
                .thenReturn(response2);

        String result = documentQueryTools.compareDocuments(
                docId1.toString(), docId2.toString(), "pricing");

        assertThat(result).contains("문서 1");
        assertThat(result).contains("문서 2");
        assertThat(result).contains("Document 1 content about pricing.");
        assertThat(result).contains("Document 2 content about pricing.");
    }

    @Test
    void searchDocuments_collectsResultsForSourceTracking() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("report.pdf")
                .text("Revenue data").pageNumber(3).sectionTitle("Finance").score(0.012)
                .build();

        when(hybridSearchService.search(any())).thenReturn(
                SearchResponse.builder().results(List.of(chunk))
                        .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build());

        documentQueryTools.clearCollectedResults();
        documentQueryTools.searchDocuments("revenue", null);

        List<SearchResult> collected = documentQueryTools.getCollectedResults();
        assertThat(collected).hasSize(1);
        assertThat(collected.get(0).getDocumentId()).isEqualTo(docId);
        assertThat(collected.get(0).getFilename()).isEqualTo("report.pdf");
        assertThat(collected.get(0).getScore()).isEqualTo(0.012);
    }

    @Test
    void clearCollectedResults_resetsCollection() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("a.pdf")
                .text("text").pageNumber(1).score(0.01).build();

        when(hybridSearchService.search(any())).thenReturn(
                SearchResponse.builder().results(List.of(chunk))
                        .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build());

        documentQueryTools.clearCollectedResults();
        documentQueryTools.searchDocuments("q", null);
        assertThat(documentQueryTools.getCollectedResults()).hasSize(1);

        documentQueryTools.clearCollectedResults();
        assertThat(documentQueryTools.getCollectedResults()).isEmpty();
    }

    @Test
    void extractAndCompile_returnsFormattedData() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1")
                .documentId(docId)
                .filename("data.xlsx")
                .text("Revenue: $1M, Profit: $200K")
                .pageNumber(1)
                .score(0.95)
                .build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(chunk))
                .totalResults(1)
                .elapsedMs(15L)
                .vectorHits(1)
                .bm25Hits(0)
                .build();

        when(hybridSearchService.search(any())).thenReturn(response);

        String result = documentQueryTools.extractAndCompile(
                List.of(docId.toString()), "financial data", "table");

        assertThat(result).contains("data.xlsx");
        assertThat(result).contains("Revenue: $1M, Profit: $200K");
    }

    @Test
    void searchDocuments_emitsToolEvents() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("report.pdf")
                .text("Revenue data").pageNumber(3).score(0.9).build();

        when(hybridSearchService.search(any())).thenReturn(
                SearchResponse.builder().results(List.of(chunk))
                        .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build());

        List<ToolEvent> events = new ArrayList<>();
        documentQueryTools.setEventCallback(events::add);

        documentQueryTools.searchDocuments("revenue", null);

        assertThat(events).hasSize(2);
        assertThat(events.get(0).getEventType()).isEqualTo("tool_start");
        assertThat(events.get(0).getTool()).isEqualTo("searchDocuments");
        assertThat(events.get(1).getEventType()).isEqualTo("tool_end");
        assertThat(events.get(1).getMessage()).contains("1개");
    }

    @Test
    void formatResults_tableChunk_includesTableDataAnnotation() {
        UUID docId = UUID.randomUUID();
        SearchResult tableChunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("financial.xlsx")
                .text("매출액: 150억, 영업이익: 30억").pageNumber(1)
                .chunkType("TABLE").score(0.95).build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(tableChunk))
                .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build();

        when(hybridSearchService.search(any())).thenReturn(response);

        String result = documentQueryTools.searchDocuments("매출액", null);

        assertThat(result).contains("[표 데이터");
        assertThat(result).contains("매출액: 150억, 영업이익: 30억");
    }

    @Test
    void formatResults_textChunk_doesNotIncludeTableDataAnnotation() {
        UUID docId = UUID.randomUUID();
        SearchResult textChunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("report.pdf")
                .text("회사의 매출이 성장했습니다.").pageNumber(2)
                .chunkType("TEXT").score(0.9).build();

        SearchResponse response = SearchResponse.builder()
                .results(List.of(textChunk))
                .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build();

        when(hybridSearchService.search(any())).thenReturn(response);

        String result = documentQueryTools.searchDocuments("매출", null);

        assertThat(result).doesNotContain("[표 데이터");
        assertThat(result).contains("회사의 매출이 성장했습니다.");
    }

    @Test
    void searchDocuments_instanceCollectedResultsWorks() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("report.pdf")
                .text("text").pageNumber(1).score(0.9).build();

        when(hybridSearchService.search(any())).thenReturn(
                SearchResponse.builder().results(List.of(chunk))
                        .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0).build());

        DocumentQueryTools freshTools = new DocumentQueryTools(hybridSearchService);
        freshTools.searchDocuments("query", null);

        assertThat(freshTools.getInstanceCollectedResults()).hasSize(1);
        assertThat(freshTools.getInstanceCollectedResults().get(0).getDocumentId()).isEqualTo(docId);
    }
}
