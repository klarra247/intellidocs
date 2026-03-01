package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final ChatLanguageModel chatLanguageModel;
    private final DocumentQueryTools documentQueryTools;
    private final FinancialCalculatorTools financialCalculatorTools;

    @Value("${app.llm.provider:anthropic}")
    private String provider;

    @Value("${app.llm.anthropic.api-key:}")
    private String anthropicKey;

    @Value("${app.llm.openai.api-key:}")
    private String openaiKey;

    private IntelliDocsAgent agent;

    @PostConstruct
    void init() {
        agent = AiServices.builder(IntelliDocsAgent.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemoryProvider(memoryId ->
                        MessageWindowChatMemory.builder()
                                .id(memoryId)
                                .maxMessages(10)
                                .build())
                .tools(documentQueryTools, financialCalculatorTools)
                .build();
        log.info("[AgentService] IntelliDocsAgent initialized with tools: DocumentQueryTools, FinancialCalculatorTools");
    }

    public AgentResponse chat(AgentRequest request) {
        long start = System.currentTimeMillis();

        // 1. Validate question
        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            throw BusinessException.badRequest("질문을 입력해 주세요.");
        }

        // 2. Validate API key
        String activeKey = "openai".equalsIgnoreCase(provider) ? openaiKey : anthropicKey;
        if (activeKey == null || activeKey.isBlank()) {
            throw BusinessException.badRequest(
                    "LLM API 키가 설정되지 않았습니다. 환경변수 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.");
        }

        // 3. Determine memory ID
        Object memoryId = request.getSessionId() != null
                ? request.getSessionId()
                : UUID.randomUUID();

        // 4. Build user message (append document IDs if present)
        String userMessage = request.getQuestion();
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            String idList = request.getDocumentIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.joining(", "));
            userMessage += "\n[검색 대상 문서 ID: " + idList + "]";
        }

        // 5. Call agent
        String answer;
        try {
            answer = agent.chat(memoryId, userMessage);
        } catch (Exception e) {
            log.error("[AgentService] Error during agent.chat: {}", e.getMessage(), e);
            answer = "응답 생성 중 오류가 발생했습니다: " + e.getMessage();
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("[AgentService] answered in {}ms", elapsed);

        return AgentResponse.builder()
                .answer(answer)
                .sources(List.of())
                .confidence(0.0)
                .elapsedMs(elapsed)
                .build();
    }
}
