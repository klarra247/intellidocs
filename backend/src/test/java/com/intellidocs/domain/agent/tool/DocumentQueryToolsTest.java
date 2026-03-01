package com.intellidocs.domain.agent.tool;

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
        assertThat(result).contains("페이지 3");
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
}
