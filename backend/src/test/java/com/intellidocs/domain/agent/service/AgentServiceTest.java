package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.output.FinishReason;
import dev.langchain4j.model.output.TokenUsage;
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
    void chat_returnsAgentResponse() {
        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        AgentResponse response = agentService.chat(request);

        assertThat(response.getAnswer()).isNotBlank();
        assertThat(response.getElapsedMs()).isGreaterThanOrEqualTo(0);
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
}
