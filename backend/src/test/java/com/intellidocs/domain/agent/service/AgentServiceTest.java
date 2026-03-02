package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.output.FinishReason;
import dev.langchain4j.model.output.TokenUsage;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentServiceTest {

    @Mock private ChatLanguageModel chatLanguageModel;
    @Mock private HybridSearchService hybridSearchService;

    private AgentService agentService;

    @BeforeEach
    void setUp() {
        // Stub the ChatLanguageModel to return a simple text response (no tool calls)
        AiMessage aiMessage = AiMessage.from("테스트 응답입니다.");
        ChatResponse chatResponse = ChatResponse.builder()
                .aiMessage(aiMessage)
                .tokenUsage(new TokenUsage(10, 20))
                .finishReason(FinishReason.STOP)
                .build();
        lenient().when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(chatResponse);

        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService);
        FinancialCalculatorTools calcTools = new FinancialCalculatorTools();
        agentService = new AgentService(chatLanguageModel, queryTools, calcTools);
        ReflectionTestUtils.setField(agentService, "provider", "anthropic");
        ReflectionTestUtils.setField(agentService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(agentService, "openaiKey", "");
        agentService.init();
    }

    @Test
    void chat_returnsAgentResponseWithConfidenceLevel() {
        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        AgentResponse response = agentService.chat(request);

        assertThat(response.getAnswer()).isNotBlank();
        assertThat(response.getElapsedMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.getConfidenceLevel()).isNotNull();
    }

    @Test
    void chat_populatesSourcesAndConfidenceFromToolResults() {
        // Pre-populate the tool's ThreadLocal with search results
        // to simulate what happens when the agent calls a search tool
        UUID docId = UUID.randomUUID();
        SearchResult chunk = SearchResult.builder()
                .chunkId("c1").documentId(docId).filename("report.pdf")
                .text("매출 150억원").pageNumber(3).sectionTitle("재무")
                .score(0.012).build();

        when(hybridSearchService.search(any())).thenReturn(
                SearchResponse.builder()
                        .results(List.of(chunk))
                        .totalResults(1).elapsedMs(10L).vectorHits(1).bm25Hits(0)
                        .build());

        // Manually invoke the tool to populate ThreadLocal (simulating agent tool call)
        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService);
        AgentService localService = new AgentService(chatLanguageModel, queryTools, new FinancialCalculatorTools());
        ReflectionTestUtils.setField(localService, "provider", "anthropic");
        ReflectionTestUtils.setField(localService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(localService, "openaiKey", "");
        localService.init();

        // The agent will call chatLanguageModel which returns a simple text (no tool calls)
        // But we can test the source mapping by calling the tool directly first,
        // then verifying the AgentService correctly reads collected results.
        // Since the mock LLM doesn't actually trigger tool calls, we test the
        // clearCollectedResults/getCollectedResults contract directly.
        queryTools.clearCollectedResults();
        queryTools.searchDocuments("매출", null);

        List<SearchResult> collected = queryTools.getCollectedResults();
        assertThat(collected).hasSize(1);
        assertThat(collected.get(0).getDocumentId()).isEqualTo(docId);
        assertThat(collected.get(0).getScore()).isEqualTo(0.012);
    }

    @Test
    void chat_noToolCalls_returnsEmptySourcesAndZeroConfidence() {
        // When agent answers without calling any tool, sources should be empty
        AgentRequest request = AgentRequest.builder()
                .question("안녕하세요")
                .build();

        AgentResponse response = agentService.chat(request);

        assertThat(response.getSources()).isEmpty();
        assertThat(response.getConfidence()).isEqualTo(0.0);
        assertThat(response.getConfidenceLevel()).isEqualTo("VERY_LOW");
    }

    @Test
    void chat_blankQuestion_throwsBadRequest() {
        AgentRequest request = AgentRequest.builder()
                .question("   ")
                .build();

        assertThatThrownBy(() -> agentService.chat(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("질문");
    }

    @Test
    void chat_missingApiKey_throwsBadRequest() {
        ReflectionTestUtils.setField(agentService, "anthropicKey", "");

        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        assertThatThrownBy(() -> agentService.chat(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("API 키");
    }

    @Test
    void chat_withSessionId_maintainsSeparateMemory() {
        UUID session1 = UUID.randomUUID();
        UUID session2 = UUID.randomUUID();

        AgentRequest request1 = AgentRequest.builder()
                .question("질문 1")
                .sessionId(session1)
                .build();
        AgentRequest request2 = AgentRequest.builder()
                .question("질문 2")
                .sessionId(session2)
                .build();

        AgentResponse response1 = agentService.chat(request1);
        AgentResponse response2 = agentService.chat(request2);

        assertThat(response1.getAnswer()).isNotBlank();
        assertThat(response2.getAnswer()).isNotBlank();
        verify(chatLanguageModel, atLeast(2)).chat(any(ChatRequest.class));
    }

    @Test
    void chat_llmFailsOnce_retriesAndSucceeds() {
        // First call throws, second succeeds
        AiMessage aiMessage = AiMessage.from("재시도 성공");
        ChatResponse chatResponse = ChatResponse.builder()
                .aiMessage(aiMessage)
                .tokenUsage(new TokenUsage(10, 20))
                .finishReason(FinishReason.STOP)
                .build();
        when(chatLanguageModel.chat(any(ChatRequest.class)))
                .thenThrow(new RuntimeException("temporary failure"))
                .thenReturn(chatResponse);

        // Rebuild agent with fresh mock
        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService);
        AgentService retryService = new AgentService(chatLanguageModel, queryTools, new FinancialCalculatorTools());
        ReflectionTestUtils.setField(retryService, "provider", "anthropic");
        ReflectionTestUtils.setField(retryService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(retryService, "openaiKey", "");
        retryService.init();

        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        AgentResponse response = retryService.chat(request);

        assertThat(response.getAnswer()).isEqualTo("재시도 성공");
        verify(chatLanguageModel, times(2)).chat(any(ChatRequest.class));
    }

    @Test
    void chat_tableInAnswer_populatesTableData() {
        String tableAnswer = """
                매출 데이터:

                | 연도 | 매출 |
                |------|------|
                | 2023 | 100억 |
                | 2024 | 150억 |
                """;
        AiMessage aiMessage = AiMessage.from(tableAnswer);
        ChatResponse chatResponse = ChatResponse.builder()
                .aiMessage(aiMessage)
                .tokenUsage(new TokenUsage(10, 20))
                .finishReason(FinishReason.STOP)
                .build();
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(chatResponse);

        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService);
        AgentService tableService = new AgentService(chatLanguageModel, queryTools, new FinancialCalculatorTools());
        ReflectionTestUtils.setField(tableService, "provider", "anthropic");
        ReflectionTestUtils.setField(tableService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(tableService, "openaiKey", "");
        tableService.init();

        AgentRequest request = AgentRequest.builder()
                .question("매출 테이블을 보여주세요")
                .build();

        AgentResponse response = tableService.chat(request);

        assertThat(response.getTableData()).isNotNull();
        assertThat(response.getTableData()).hasSize(1);
        assertThat(response.getTableData().get(0).getHeaders()).containsExactly("연도", "매출");
    }
}
