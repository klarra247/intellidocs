package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.search.dto.SearchResult;
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

    private static final int MAX_QUESTION_LENGTH = 2000;

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

        // 4. Build user message (truncate if too long, append document IDs if present)
        String question = request.getQuestion();
        if (question.length() > MAX_QUESTION_LENGTH) {
            log.warn("[AgentService] Question truncated from {} to {} chars", question.length(), MAX_QUESTION_LENGTH);
            question = question.substring(0, MAX_QUESTION_LENGTH);
        }

        String userMessage = question;
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            String idList = request.getDocumentIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.joining(", "));
            userMessage += "\n[검색 대상 문서 ID: " + idList + "]";
        }

        // 5. Call agent with 1 retry on failure
        documentQueryTools.clearCollectedResults();
        financialCalculatorTools.resetCalculationCount();

        String answer;
        try {
            answer = agent.chat(memoryId, userMessage);
        } catch (Exception e) {
            log.warn("[AgentService] First attempt failed, retrying: {}", e.getMessage());
            documentQueryTools.clearCollectedResults();
            try {
                answer = agent.chat(memoryId, userMessage);
            } catch (Exception retryEx) {
                log.error("[AgentService] Retry also failed: {}", retryEx.getMessage(), retryEx);
                answer = "응답 생성 중 오류가 발생했습니다: " + retryEx.getMessage();
            }
        }

        // 6. Build sources and confidence from collected search results
        List<SearchResult> collected = documentQueryTools.getCollectedResults();
        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(collected);
        double confidence = SearchResultUtils.computeConfidence(collected,
                financialCalculatorTools.getCalculationCount(), documentQueryTools.getDiscrepancyDetectionCount());
        String confidenceLevel = SearchResultUtils.computeConfidenceLevel(confidence);

        // 7. Extract table data (best-effort)
        List<AgentResponse.TableData> tableData = AnswerPostProcessor.extractTables(answer);

        long elapsed = System.currentTimeMillis() - start;
        log.info("[AgentService] answered in {}ms, confidence={} ({}), sources={}",
                elapsed, String.format("%.2f", confidence), confidenceLevel, sources.size());

        return AgentResponse.builder()
                .answer(answer)
                .sources(sources)
                .confidence(confidence)
                .confidenceLevel(confidenceLevel)
                .tableData(tableData.isEmpty() ? null : tableData)
                .elapsedMs(elapsed)
                .build();
    }

}
