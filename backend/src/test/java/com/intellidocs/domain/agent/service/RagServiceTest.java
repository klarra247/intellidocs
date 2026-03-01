package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagServiceTest {

    @Mock
    private HybridSearchService hybridSearchService;

    @Mock
    private ChatLanguageModel chatLanguageModel;

    @InjectMocks
    private RagService ragService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ragService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(ragService, "openaiKey", "");
        ReflectionTestUtils.setField(ragService, "provider", "anthropic");
        ReflectionTestUtils.setField(ragService, "maxContextTokens", 8000);
    }

    @Test
    void chat_returnsAnswerWithSources() {
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("chunk-1")
                .documentId(docId)
                .filename("report.pdf")
                .text("The revenue grew 20% YoY.")
                .pageNumber(3)
                .sectionTitle("Financial Summary")
                .score(0.012)
                .build();

        SearchResponse searchResponse = SearchResponse.builder()
                .results(List.of(chunk))
                .totalResults(1)
                .elapsedMs(50L)
                .vectorHits(1)
                .bm25Hits(1)
                .build();

        when(hybridSearchService.search(any())).thenReturn(searchResponse);

        ChatResponse chatResponse = mock(ChatResponse.class);
        AiMessage aiMessage = mock(AiMessage.class);
        when(aiMessage.text()).thenReturn("Revenue grew 20% year-over-year.");
        when(chatResponse.aiMessage()).thenReturn(aiMessage);
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(chatResponse);

        AgentRequest request = AgentRequest.builder().question("What was the revenue growth?").build();

        AgentResponse response = ragService.chat(request);

        assertThat(response.getAnswer()).isEqualTo("Revenue grew 20% year-over-year.");
        assertThat(response.getSources()).hasSize(1);
        assertThat(response.getSources().get(0).getFilename()).isEqualTo("report.pdf");
        assertThat(response.getSources().get(0).getPageNumber()).isEqualTo(3);
        assertThat(response.getConfidence()).isBetween(0.0, 1.0);
        assertThat(response.getElapsedMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    void chat_emptyQuestion_throwsBadRequest() {
        AgentRequest request = AgentRequest.builder().question("   ").build();
        assertThatThrownBy(() -> ragService.chat(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("질문");
    }

    @Test
    void chat_missingApiKey_throwsBadRequest() {
        ReflectionTestUtils.setField(ragService, "anthropicKey", "");

        AgentRequest request = AgentRequest.builder().question("What is the revenue?").build();
        assertThatThrownBy(() -> ragService.chat(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("LLM API 키");
    }

    @Test
    void chat_noSearchResults_returnsNoInfoAnswer() {
        SearchResponse empty = SearchResponse.builder()
                .results(List.of())
                .totalResults(0)
                .elapsedMs(10L)
                .vectorHits(0)
                .bm25Hits(0)
                .build();
        when(hybridSearchService.search(any())).thenReturn(empty);

        AgentRequest request = AgentRequest.builder().question("What is the revenue?").build();
        AgentResponse response = ragService.chat(request);

        assertThat(response.getAnswer()).contains("관련 문서를 찾을 수 없습니다");
        assertThat(response.getSources()).isEmpty();
        assertThat(response.getConfidence()).isEqualTo(0.0);
        verifyNoInteractions(chatLanguageModel);
    }

    @Test
    void chat_deduplicatesSourcesByDocumentAndPage() {
        UUID docId = UUID.randomUUID();
        SearchResult c1 = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("a.pdf")
                .text("chunk one").pageNumber(1).score(0.01).build();
        SearchResult c2 = SearchResult.builder()
                .chunkId("c2").documentId(docId).filename("a.pdf")
                .text("chunk two").pageNumber(1).score(0.009).build();

        SearchResponse sr = SearchResponse.builder()
                .results(List.of(c1, c2)).totalResults(2)
                .elapsedMs(20L).vectorHits(1).bm25Hits(1).build();
        when(hybridSearchService.search(any())).thenReturn(sr);

        ChatResponse cr = mock(ChatResponse.class);
        AiMessage am = mock(AiMessage.class);
        when(am.text()).thenReturn("Answer.");
        when(cr.aiMessage()).thenReturn(am);
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(cr);

        AgentRequest req = AgentRequest.builder().question("Tell me about it.").build();
        AgentResponse resp = ragService.chat(req);
        assertThat(resp.getSources()).hasSize(1);
    }
}
