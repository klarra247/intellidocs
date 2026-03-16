package com.intellidocs.domain.knowledgegraph.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.knowledgegraph.entity.DocumentMetric;
import com.intellidocs.domain.knowledgegraph.repository.DocumentMetricRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MetricExtractionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final DocumentMetricRepository documentMetricRepository;
    private final QdrantChunkRetrievalService qdrantService;
    private final ChatLanguageModel chatLanguageModel;
    private final MetricNormalizationService normalizationService;

    public MetricExtractionService(DocumentRepository documentRepository,
                                   DocumentChunkRepository chunkRepository,
                                   DocumentMetricRepository documentMetricRepository,
                                   QdrantChunkRetrievalService qdrantService,
                                   @Qualifier("kgChatLanguageModel") ChatLanguageModel chatLanguageModel,
                                   MetricNormalizationService normalizationService) {
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.documentMetricRepository = documentMetricRepository;
        this.qdrantService = qdrantService;
        this.chatLanguageModel = chatLanguageModel;
        this.normalizationService = normalizationService;
    }

    private static final int BATCH_SIZE = 5;
    private static final int MAX_CHUNKS = 20;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transactional
    public void extractMetrics(UUID documentId) {
        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null) {
            log.warn("[KG] Document not found: {}", documentId);
            return;
        }

        UUID workspaceId = doc.getWorkspaceId();

        // 기존 지표 삭제 (재추출)
        documentMetricRepository.deleteByDocumentId(documentId);

        // 청크 로드 (sectionTitle 우선, 최대 20개)
        List<DocumentChunk> allChunks = chunkRepository.findByDocumentIdOrderByChunkIndex(documentId);
        List<DocumentChunk> selected = selectChunks(allChunks);

        if (selected.isEmpty()) {
            log.info("[KG] No chunks to extract metrics from: {}", documentId);
            return;
        }

        // Qdrant에서 텍스트 조회
        List<Integer> indices = selected.stream().map(DocumentChunk::getChunkIndex).toList();
        Map<Integer, String> textMap = qdrantService.getChunkTexts(documentId, indices);

        // 배치별 LLM 호출 + 지표 수집
        Map<String, DocumentMetric> deduped = new LinkedHashMap<>();
        List<List<DocumentChunk>> batches = partition(selected, BATCH_SIZE);

        for (List<DocumentChunk> batch : batches) {
            String combinedText = batch.stream()
                    .map(c -> textMap.getOrDefault(c.getChunkIndex(), ""))
                    .filter(t -> !t.isBlank())
                    .collect(Collectors.joining("\n---\n"));

            if (combinedText.isBlank()) continue;

            List<RawMetric> extracted = callLlm(combinedText);

            for (RawMetric raw : extracted) {
                // 환각 필터: 지표명이 청크 텍스트에 존재하는지 확인
                if (!combinedText.contains(raw.metric)) {
                    log.debug("[KG] Hallucination filtered: '{}' not found in chunk text", raw.metric);
                    continue;
                }

                String normalized = normalizationService.normalize(raw.metric);
                if (normalized.isEmpty()) continue;

                // 중복 제거: normalizedMetric 기준 (문서당 하나의 지표, 첫 번째 유지)
                if (deduped.containsKey(normalized)) continue;

                DocumentChunk firstChunk = batch.get(0);

                DocumentMetric metric = DocumentMetric.builder()
                        .workspaceId(workspaceId)
                        .documentId(documentId)
                        .metricName(raw.metric)
                        .normalizedMetric(normalized)
                        .value(raw.value)
                        .numericValue(raw.numericValue != null ? BigDecimal.valueOf(raw.numericValue) : null)
                        .unit(raw.unit)
                        .period(raw.period)
                        .chunkIndex(firstChunk.getChunkIndex())
                        .pageNumber(firstChunk.getPageNumber())
                        .build();

                deduped.put(normalized, metric);
            }

            try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }

        if (!deduped.isEmpty()) {
            documentMetricRepository.saveAll(new ArrayList<>(deduped.values()));
            log.info("[KG] Extracted {} metrics from document {}", deduped.size(), documentId);
        }
    }

    List<DocumentChunk> selectChunks(List<DocumentChunk> all) {
        List<DocumentChunk> withTitle = all.stream()
                .filter(c -> c.getSectionTitle() != null && !c.getSectionTitle().isBlank())
                .toList();

        if (withTitle.size() >= MAX_CHUNKS) {
            return withTitle.subList(0, MAX_CHUNKS);
        }

        List<DocumentChunk> result = new ArrayList<>(withTitle);
        for (DocumentChunk c : all) {
            if (result.size() >= MAX_CHUNKS) break;
            if (!result.contains(c)) result.add(c);
        }
        return result;
    }

    private List<RawMetric> callLlm(String chunkTexts) {
        String prompt = """
                다음 문서에서 핵심 재무/사업 지표를 추출해주세요.

                추출할 것:
                - 지표명 (매출액, 영업이익, 부채비율, 유동자산, 임직원 수 등)
                - 각 지표의 값과 기간

                JSON으로 응답:
                [
                  { "metric": "매출액", "value": "108억원", "numericValue": 108, "unit": "억원", "period": "2024-Q1" },
                  { "metric": "영업이익", "value": "16억원", "numericValue": 16, "unit": "억원", "period": "2024-Q1" }
                ]

                지표명은 정식 명칭으로 통일해줘 (매출→매출액, 부채비율→부채비율).
                금액은 억원 단위로 통일. 비율은 %% 단위로.
                JSON만 응답하고 다른 텍스트는 쓰지 마.

                문서 내용:
                %s
                """.formatted(chunkTexts);

        try {
            ChatRequest chatRequest = ChatRequest.builder()
                    .messages(List.of(UserMessage.from(prompt)))
                    .build();

            ChatResponse chatResponse = chatLanguageModel.chat(chatRequest);
            String text = chatResponse.aiMessage() != null ? chatResponse.aiMessage().text() : null;

            if (text == null || text.isBlank()) {
                log.warn("[KG] Empty LLM response");
                return List.of();
            }

            return parseResponse(text.trim());
        } catch (Exception e) {
            log.error("[KG] LLM call failed", e);
            return List.of();
        }
    }

    List<RawMetric> parseResponse(String response) {
        try {
            String json = response.trim();
            if (json.contains("[")) {
                json = json.substring(json.indexOf('['), json.lastIndexOf(']') + 1);
            }
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[KG] Failed to parse LLM response as JSON: {}", e.getMessage());
            return List.of();
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }

    // LLM JSON 파싱용 내부 DTO
    static class RawMetric {
        public String metric;
        public String value;
        public Double numericValue;
        public String unit;
        public String period;
    }
}
