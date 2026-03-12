package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.chat.service.ChatHistoryService;
import com.intellidocs.domain.discrepancy.service.DiscrepancyService;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class StreamingAgentServiceTest {

    private static final UUID TEST_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Mock private StreamingChatLanguageModel streamingChatLanguageModel;
    @Mock private HybridSearchService hybridSearchService;
    @Mock private ChatHistoryService chatHistoryService;
    @Mock private DiscrepancyService discrepancyService;
    @Mock private DocumentRepository documentRepository;
    @Mock private com.intellidocs.domain.diff.repository.DiffRepository diffRepository;
    @Mock private com.intellidocs.domain.knowledgegraph.tool.KnowledgeGraphTools knowledgeGraphTools;

    private StreamingAgentService streamingAgentService;

    @BeforeEach
    void setUp() {
        streamingAgentService = new StreamingAgentService(
                streamingChatLanguageModel, hybridSearchService, chatHistoryService,
                discrepancyService, documentRepository, diffRepository, knowledgeGraphTools);
        ReflectionTestUtils.setField(streamingAgentService, "provider", "anthropic");
        ReflectionTestUtils.setField(streamingAgentService, "anthropicKey", "sk-test-key");
        ReflectionTestUtils.setField(streamingAgentService, "openaiKey", "");
    }

    @Test
    void streamChat_blankQuestion_throwsBadRequest() {
        AgentRequest request = AgentRequest.builder()
                .question("   ")
                .build();

        assertThatThrownBy(() -> streamingAgentService.streamChat(request, TEST_USER_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("질문");
    }

    @Test
    void streamChat_missingApiKey_throwsBadRequest() {
        ReflectionTestUtils.setField(streamingAgentService, "anthropicKey", "");

        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        assertThatThrownBy(() -> streamingAgentService.streamChat(request, TEST_USER_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("API 키");
    }

    @Test
    void streamChat_validRequest_returnsSseEmitter() {
        AgentRequest request = AgentRequest.builder()
                .question("매출이 얼마인가요?")
                .build();

        SseEmitter emitter = streamingAgentService.streamChat(request, TEST_USER_ID);
        assertThat(emitter).isNotNull();
    }
}
