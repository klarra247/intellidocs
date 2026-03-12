package com.intellidocs.domain.knowledgegraph.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.knowledgegraph.entity.EntityType;
import com.intellidocs.domain.knowledgegraph.entity.KgEntity;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class EntityExtractionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final KgEntityRepository kgEntityRepository;
    private final QdrantChunkRetrievalService qdrantService;
    private final ChatLanguageModel chatLanguageModel;
    private final EntityNormalizationService normalizationService;

    public EntityExtractionService(DocumentRepository documentRepository,
                                   DocumentChunkRepository chunkRepository,
                                   KgEntityRepository kgEntityRepository,
                                   QdrantChunkRetrievalService qdrantService,
                                   @Qualifier("kgChatLanguageModel") ChatLanguageModel chatLanguageModel,
                                   EntityNormalizationService normalizationService) {
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.kgEntityRepository = kgEntityRepository;
        this.qdrantService = qdrantService;
        this.chatLanguageModel = chatLanguageModel;
        this.normalizationService = normalizationService;
    }

    private static final int BATCH_SIZE = 5;
    private static final int MAX_CHUNKS = 20;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transactional
    public void extractEntities(UUID documentId) {
        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null) {
            log.warn("[KG] Document not found: {}", documentId);
            return;
        }

        UUID workspaceId = doc.getWorkspaceId();

        // 기존 엔티티 삭제 (재추출)
        kgEntityRepository.deleteByDocumentId(documentId);

        // 청크 로드 (sectionTitle 우선, 최대 20개)
        List<DocumentChunk> allChunks = chunkRepository.findByDocumentIdOrderByChunkIndex(documentId);
        List<DocumentChunk> selected = selectChunks(allChunks);

        if (selected.isEmpty()) {
            log.info("[KG] No chunks to extract entities from: {}", documentId);
            return;
        }

        // Qdrant에서 텍스트 조회
        List<Integer> indices = selected.stream().map(DocumentChunk::getChunkIndex).toList();
        Map<Integer, String> textMap = qdrantService.getChunkTexts(documentId, indices);

        // 배치별 LLM 호출 + 엔티티 수집
        Map<String, KgEntity> deduped = new LinkedHashMap<>();
        List<List<DocumentChunk>> batches = partition(selected, BATCH_SIZE);

        for (List<DocumentChunk> batch : batches) {
            String combinedText = batch.stream()
                    .map(c -> textMap.getOrDefault(c.getChunkIndex(), ""))
                    .filter(t -> !t.isBlank())
                    .collect(Collectors.joining("\n---\n"));

            if (combinedText.isBlank()) continue;

            List<RawEntity> extracted = callLlm(combinedText);

            for (RawEntity raw : extracted) {
                // 환각 필터: 엔티티 name이 청크 텍스트에 존재하는지 확인
                if (!combinedText.contains(raw.name)) {
                    log.debug("[KG] Hallucination filtered: '{}' not found in chunk text", raw.name);
                    continue;
                }

                String normalized = normalizationService.normalize(raw.name);
                if (normalized.isEmpty()) continue;

                EntityType type = parseEntityType(raw.getEntityType());
                String dedupeKey = normalized + "|" + type.name();

                if (deduped.containsKey(dedupeKey)) continue;

                DocumentChunk firstChunk = batch.get(0);

                KgEntity entity = KgEntity.builder()
                        .workspaceId(workspaceId)
                        .documentId(documentId)
                        .name(raw.name)
                        .normalizedName(normalized)
                        .entityType(type)
                        .value(raw.value)
                        .period(raw.period)
                        .chunkIndex(firstChunk.getChunkIndex())
                        .pageNumber(firstChunk.getPageNumber())
                        .build();

                deduped.put(dedupeKey, entity);
            }

            try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }

        if (!deduped.isEmpty()) {
            kgEntityRepository.saveAll(new ArrayList<>(deduped.values()));
            log.info("[KG] Extracted {} entities from document {}", deduped.size(), documentId);
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

    private List<RawEntity> callLlm(String chunkTexts) {
        String prompt = """
                다음 문서 내용에서 핵심 엔티티를 추출해주세요.

                엔티티 유형:
                - COMPANY: 회사명, 기관명
                - METRIC: 재무/사업 지표명 (매출액, 영업이익, 부채비율 등)
                - AMOUNT: 구체적 금액/수치 (452억원, 16.8%% 등)
                - DATE: 날짜/기간 (2024년 2분기, 2024.04~2024.06 등)
                - PERSON: 인물명
                - CLAUSE: 계약 조항/조건

                각 엔티티에 대해 다음을 응답:
                - name: 원문 표현 그대로
                - entity_type: 위 유형 중 하나 (대문자)
                - value: 수치 엔티티면 값 (없으면 null)
                - period: 관련 기간 (없으면 null)

                JSON 배열로만 응답. 다른 텍스트 없이.

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

    List<RawEntity> parseResponse(String response) {
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

    EntityType parseEntityType(String raw) {
        if (raw == null) return EntityType.OTHER;
        try {
            return EntityType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return EntityType.OTHER;
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
    static class RawEntity {
        public String name;
        public String entity_type;
        public String entityType;
        public String value;
        public String period;

        public String getEntityType() {
            return entity_type != null ? entity_type : entityType;
        }
    }
}
