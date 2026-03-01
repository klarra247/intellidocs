package com.intellidocs.domain.agent.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private final HybridSearchService hybridSearchService;
    private final ChatLanguageModel chatLanguageModel;

    @Value("${app.llm.provider:anthropic}")
    private String provider;

    @Value("${app.llm.anthropic.api-key:}")
    private String anthropicKey;

    @Value("${app.llm.openai.api-key:}")
    private String openaiKey;

    @Value("${app.llm.max-context-tokens:8000}")
    private int maxContextTokens;

    private static final int SEARCH_LIMIT = 10;

    private static final String SYSTEM_PROMPT = """
            당신은 문서 기반 질의응답 시스템입니다.
            아래에 제공된 문서 컨텍스트만을 근거로 답변하세요.
            컨텍스트에 없는 정보는 추측하거나 생성하지 마세요.
            답변 시 출처를 반드시 명시하세요 (문서명, 페이지 번호).
            표 형태의 데이터는 마크다운 테이블로 표현하세요.
            컨텍스트에서 답을 찾을 수 없으면 "제공된 문서에서 해당 정보를 찾을 수 없습니다."라고 답하세요.
            """;

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

        // 3. Hybrid search
        SearchRequest.Filters filters = null;
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            filters = SearchRequest.Filters.builder()
                    .documentIds(request.getDocumentIds())
                    .build();
        }
        SearchRequest searchRequest = SearchRequest.builder()
                .query(request.getQuestion())
                .filters(filters)
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse searchResponse = hybridSearchService.search(searchRequest);
        List<SearchResult> results = searchResponse.getResults();

        log.debug("[RAG] query='{}', hits={}", request.getQuestion(), results.size());

        // 4. No results → short-circuit
        if (results.isEmpty()) {
            return AgentResponse.builder()
                    .answer("관련 문서를 찾을 수 없습니다. 다른 질문을 시도하거나 문서를 업로드해 주세요.")
                    .sources(List.of())
                    .confidence(0.0)
                    .elapsedMs(System.currentTimeMillis() - start)
                    .build();
        }

        // 5. Build context (token-limited)
        StringBuilder contextBuilder = new StringBuilder();
        int usedTokens = 0;
        List<SearchResult> usedChunks = new ArrayList<>();

        for (SearchResult result : results) {
            String text = result.getText();
            if (text == null || text.isBlank()) continue;
            int chunkTokens = text.length() / 4;
            if (usedTokens + chunkTokens > maxContextTokens) break;

            contextBuilder.append(String.format("[출처: %s, 페이지 %d]\n%s\n\n",
                    result.getFilename() != null ? result.getFilename() : "Unknown",
                    result.getPageNumber() != null ? result.getPageNumber() : 0,
                    text));
            usedTokens += chunkTokens;
            usedChunks.add(result);
        }

        // 6. Build prompt and call LLM
        // Use FQN to avoid import conflict with com.intellidocs.domain.chat.entity.ChatMessage
        String userPrompt = "=== 문서 컨텍스트 ===\n" + contextBuilder + "\n=== 질문 ===\n" + request.getQuestion();

        List<dev.langchain4j.data.message.ChatMessage> messages = List.of(
                SystemMessage.from(SYSTEM_PROMPT),
                UserMessage.from(userPrompt)
        );

        ChatRequest chatRequest = ChatRequest.builder()
                .messages(messages)
                .build();

        ChatResponse chatResponse = chatLanguageModel.chat(chatRequest);
        String answer = chatResponse.aiMessage().text();

        // 7. Compute confidence (average RRF score, normalised to [0,1])
        double avgScore = usedChunks.stream()
                .mapToDouble(SearchResult::getScore)
                .average()
                .orElse(0.0);
        double confidence = Math.min(1.0, avgScore * 60);

        // 8. Deduplicate sources by (documentId, pageNumber) — LinkedHashMap preserves relevance order
        Map<String, SourceInfo> sourceMap = new LinkedHashMap<>();
        for (SearchResult chunk : usedChunks) {
            String key = chunk.getDocumentId() + ":" + chunk.getPageNumber();
            sourceMap.putIfAbsent(key, SourceInfo.builder()
                    .documentId(chunk.getDocumentId())
                    .filename(chunk.getFilename())
                    .pageNumber(chunk.getPageNumber())
                    .sectionTitle(chunk.getSectionTitle())
                    .relevanceScore(chunk.getScore())
                    .build());
        }

        log.info("[RAG] answered in {}ms, confidence={}, sources={}",
                System.currentTimeMillis() - start, String.format("%.2f", confidence), sourceMap.size());

        return AgentResponse.builder()
                .answer(answer)
                .sources(new ArrayList<>(sourceMap.values()))
                .confidence(confidence)
                .elapsedMs(System.currentTimeMillis() - start)
                .build();
    }
}
