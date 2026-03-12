package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.knowledgegraph.tool.KnowledgeGraphTools;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.discrepancy.service.DiscrepancyService;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.search.dto.SearchResult;
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

import com.intellidocs.common.WorkspaceContext;

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
    private final DiscrepancyService discrepancyService;
    private final DocumentRepository documentRepository;
    private final DiffRepository diffRepository;
    private final KnowledgeGraphTools knowledgeGraphTools;

    @Value("${app.llm.provider:anthropic}")
    private String provider;

    @Value("${app.llm.anthropic.api-key:}")
    private String anthropicKey;

    @Value("${app.llm.openai.api-key:}")
    private String openaiKey;

    private static final int MAX_SESSIONS = 10_000;

    // Shared memory store for session continuity. Bounded: evicts random entry when full.
    private final Map<Object, ChatMemory> memoryStore = new ConcurrentHashMap<>();

    private static final int MAX_QUESTION_LENGTH = 2000;

    public SseEmitter streamChat(AgentRequest request, UUID userId) {
        // Capture workspace ID from request thread (ThreadLocal) before async handoff
        final UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();

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
        DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService, discrepancyService, documentRepository, diffRepository);
        FinancialCalculatorTools calcTools = new FinancialCalculatorTools();
        queryTools.setEventCallback(event -> sendSseEvent(emitter, event.getEventType(), event));
        calcTools.setEventCallback(event -> sendSseEvent(emitter, event.getEventType(), event));

        // 5. Build streaming agent
        StreamingIntelliDocsAgent agent = AiServices.builder(StreamingIntelliDocsAgent.class)
                .streamingChatLanguageModel(streamingChatLanguageModel)
                .chatMemoryProvider(id -> {
                    if (memoryStore.size() >= MAX_SESSIONS) {
                        // Evict an arbitrary entry to prevent unbounded growth
                        memoryStore.keySet().stream().findFirst().ifPresent(memoryStore::remove);
                    }
                    return memoryStore.computeIfAbsent(id,
                            k -> MessageWindowChatMemory.builder()
                                    .id(k)
                                    .maxMessages(10)
                                    .build());
                })
                .tools(queryTools, calcTools, knowledgeGraphTools)
                .build();

        // 6. User message (truncate if too long)
        String question = request.getQuestion();
        if (question.length() > MAX_QUESTION_LENGTH) {
            log.warn("[StreamingAgentService] Question truncated from {} to {} chars",
                    question.length(), MAX_QUESTION_LENGTH);
            question = question.substring(0, MAX_QUESTION_LENGTH);
        }
        String userMessage = question;
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            // Resolve filenames so the LLM references documents by name, not UUID
            String docList = documentRepository.findAllById(request.getDocumentIds()).stream()
                    .map(doc -> doc.getOriginalFilename() + " (" + doc.getId() + ")")
                    .collect(Collectors.joining(", "));
            userMessage += "\n[검색 대상 문서: " + docList + "]";
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
                        List<SourceInfo> sources = SearchResultUtils.toSources(collected);
                        double confidence = SearchResultUtils.computeConfidence(collected,
                                calcTools.getCalculationCount(), queryTools.getDiscrepancyDetectionCount(),
                                queryTools.getVersionComparisonCount());
                        String confidenceLevel = SearchResultUtils.computeConfidenceLevel(confidence);

                        sendSseEvent(emitter, "sources", Map.of(
                                "sources", sources,
                                "confidence", confidence,
                                "confidenceLevel", confidenceLevel));

                        long elapsed = System.currentTimeMillis() - startTime;
                        Map<String, Object> doneData = new HashMap<>();
                        doneData.put("elapsedMs", elapsed);

                        // Extract table data (best-effort)
                        try {
                            String fullAnswerForTables = response.aiMessage() != null
                                    ? response.aiMessage().text() : "";
                            if (fullAnswerForTables == null) fullAnswerForTables = "";
                            var tableData = AnswerPostProcessor.extractTables(fullAnswerForTables);
                            if (!tableData.isEmpty()) {
                                doneData.put("tableData", tableData);
                            }
                        } catch (Exception e) {
                            log.debug("[StreamingAgentService] Table extraction skipped: {}", e.getMessage());
                        }

                        // Save chat history in a single transaction
                        try {
                            String fullAnswer = response.aiMessage() != null
                                    ? response.aiMessage().text() : "";
                            if (fullAnswer == null) fullAnswer = "";

                            ChatHistoryService.PersistResult result =
                                    chatHistoryService.persistConversation(
                                            request.getSessionId(),
                                            request.getQuestion(),
                                            fullAnswer, sources, confidence, userId,
                                            workspaceId, request.getDocumentIds());

                            doneData.put("messageId", result.assistantMessage().getId().toString());
                            doneData.put("sessionId", result.session().getId().toString());
                        } catch (Exception e) {
                            log.error("[StreamingAgentService] Failed to save chat history", e);
                            // Don't put a fake sessionId that doesn't exist in DB
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

}
