package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.agent.dto.ToolEvent;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.service.ChatHistoryService;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.TokenStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StreamingAgentService {

    private static final long SSE_TIMEOUT = 300_000L; // 5 min

    private final StreamingChatLanguageModel streamingChatLanguageModel;
    private final HybridSearchService hybridSearchService;
    private final ChatHistoryService chatHistoryService;

    @Value("${app.llm.provider:anthropic}")
    private String provider;

    @Value("${app.llm.anthropic.api-key:}")
    private String anthropicKey;

    @Value("${app.llm.openai.api-key:}")
    private String openaiKey;

    // Shared memory store across streaming requests (for session continuity)
    private final Map<Object, ChatMemory> memoryStore = new ConcurrentHashMap<>();

    public SseEmitter streamChat(AgentRequest request) {
        // 1. Validate
        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            throw BusinessException.badRequest("질문을 입력해 주세요.");
        }
        String activeKey = "openai".equalsIgnoreCase(provider) ? openaiKey : anthropicKey;
        if (activeKey == null || activeKey.isBlank()) {
            throw BusinessException.badRequest(
                    "LLM API 키가 설정되지 않았습니다. 환경변수 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.");
        }

        // 2. Create SseEmitter
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        // 3. Memory ID
        Object memoryId = request.getSessionId() != null
                ? request.getSessionId()
                : UUID.randomUUID();

        // 4. Per-request tool instances with callbacks
        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService);
        FinancialCalculatorTools calcTools = new FinancialCalculatorTools();
        queryTools.setEventCallback(event -> sendSseEvent(emitter, event.getEventType(), event));
        calcTools.setEventCallback(event -> sendSseEvent(emitter, event.getEventType(), event));

        // 5. Build streaming agent
        StreamingIntelliDocsAgent agent = AiServices.builder(StreamingIntelliDocsAgent.class)
                .streamingChatLanguageModel(streamingChatLanguageModel)
                .chatMemoryProvider(id -> memoryStore.computeIfAbsent(id,
                        k -> MessageWindowChatMemory.builder()
                                .id(k)
                                .maxMessages(10)
                                .build()))
                .tools(queryTools, calcTools)
                .build();

        // 6. User message
        final AgentRequest finalRequest = request;
        String userMessage = request.getQuestion();
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            String idList = request.getDocumentIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.joining(", "));
            userMessage += "\n[검색 대상 문서 ID: " + idList + "]";
        }

        // 7. Start streaming
        long startTime = System.currentTimeMillis();
        TokenStream tokenStream = agent.chat(memoryId, userMessage);

        tokenStream
                .onPartialResponse(token -> sendSseEvent(emitter, "token", Map.of("text", token)))
                .onToolExecuted(execution -> log.debug("[Streaming] Tool executed: {}",
                        execution.request().name()))
                .onCompleteResponse(response -> {
                    try {
                        List<SearchResult> collected = queryTools.getInstanceCollectedResults();
                        List<SourceInfo> sources = deduplicateSources(collected);
                        double confidence = computeConfidence(collected);

                        sendSseEvent(emitter, "sources", Map.of(
                                "sources", sources,
                                "confidence", confidence));

                        long elapsed = System.currentTimeMillis() - startTime;
                        Map<String, Object> doneData = new HashMap<>();
                        doneData.put("elapsedMs", elapsed);

                        // Save chat history
                        try {
                            String fullAnswer = response.aiMessage().text();
                            ChatSession session = chatHistoryService.getOrCreateSession(
                                    finalRequest.getSessionId());
                            chatHistoryService.saveUserMessage(session, finalRequest.getQuestion());
                            ChatMessage assistantMessage = chatHistoryService.saveAssistantMessage(
                                    session, fullAnswer != null ? fullAnswer : "", sources, confidence);
                            chatHistoryService.updateSessionTitle(session, finalRequest.getQuestion());

                            doneData.put("messageId", assistantMessage.getId().toString());
                            doneData.put("sessionId", session.getId().toString());
                        } catch (Exception e) {
                            log.error("[StreamingAgentService] Failed to save chat history", e);
                            // History save failure should not break the streaming response
                            doneData.put("sessionId", memoryId.toString());
                        }

                        sendSseEvent(emitter, "done", doneData);

                        log.info("[StreamingAgentService] completed in {}ms, sources={}, confidence={}",
                                elapsed, sources.size(), String.format("%.2f", confidence));
                        emitter.complete();
                    } catch (Exception e) {
                        log.error("[StreamingAgentService] Error in onCompleteResponse", e);
                        sendErrorAndComplete(emitter, e.getMessage());
                    }
                })
                .onError(error -> {
                    log.error("[StreamingAgentService] Streaming error: {}", error.getMessage(), error);
                    sendErrorAndComplete(emitter, error.getMessage());
                })
                .start();

        // 8. Cleanup callbacks
        emitter.onTimeout(() -> log.warn("[StreamingAgentService] SSE timeout for memoryId={}", memoryId));
        emitter.onError(e -> log.warn("[StreamingAgentService] SSE error for memoryId={}", memoryId));

        return emitter;
    }

    private void sendSseEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException e) {
            log.warn("[StreamingAgentService] Failed to send SSE event '{}': {}", eventName, e.getMessage());
        }
    }

    private void sendErrorAndComplete(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event()
                    .name("error")
                    .data(Map.of("message", message != null ? message : "알 수 없는 오류가 발생했습니다.")));
        } catch (IOException ignored) {
        }
        emitter.complete();
    }

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

    private double computeConfidence(List<SearchResult> results) {
        if (results.isEmpty()) return 0.0;
        double avgScore = results.stream()
                .mapToDouble(SearchResult::getScore)
                .average()
                .orElse(0.0);
        return Math.min(1.0, avgScore * 60);
    }
}
