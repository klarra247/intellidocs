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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

        // 5. Call agent (collect search results via ThreadLocal)
        documentQueryTools.clearCollectedResults();

        String answer;
        try {
            answer = agent.chat(memoryId, userMessage);
        } catch (Exception e) {
            log.error("[AgentService] Error during agent.chat: {}", e.getMessage(), e);
            answer = "응답 생성 중 오류가 발생했습니다: " + e.getMessage();
        }

        // 6. Build sources and confidence from collected search results
        List<SearchResult> collected = documentQueryTools.getCollectedResults();
        List<SourceInfo> sources = deduplicateSources(collected);
        double confidence = computeConfidence(collected);

        long elapsed = System.currentTimeMillis() - start;
        log.info("[AgentService] answered in {}ms, confidence={}, sources={}",
                elapsed, String.format("%.2f", confidence), sources.size());

        return AgentResponse.builder()
                .answer(answer)
                .sources(sources)
                .confidence(confidence)
                .elapsedMs(elapsed)
                .build();
    }

    /**
     * Deduplicate sources by (documentId, pageNumber), preserving relevance order.
     * Same logic as the original RagService.
     */
    private List<SourceInfo> deduplicateSources(List<SearchResult> results) {
        Map<String, SourceInfo> sourceMap = new LinkedHashMap<>();
        for (SearchResult r : results) {
            if (r.getDocumentId() == null) continue;
            String key = r.getDocumentId() + ":" + r.getPageNumber();
            sourceMap.putIfAbsent(key, SourceInfo.builder()
                    .documentId(r.getDocumentId())
                    .filename(r.getFilename())
                    .pageNumber(r.getPageNumber())
                    .sectionTitle(r.getSectionTitle())
                    .relevanceScore(r.getScore())
                    .build());
        }
        return new ArrayList<>(sourceMap.values());
    }

    /**
     * Compute confidence from collected search result RRF scores.
     * Normalized to [0,1] using the same formula as RagService: min(1.0, avgScore * 60).
     */
    private double computeConfidence(List<SearchResult> results) {
        if (results.isEmpty()) return 0.0;
        double avgScore = results.stream()
                .mapToDouble(SearchResult::getScore)
                .average()
                .orElse(0.0);
        return Math.min(1.0, avgScore * 60);
    }
}
