package com.intellidocs.domain.knowledgegraph.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.domain.knowledgegraph.entity.*;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.domain.knowledgegraph.repository.KgRelationRepository;
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
public class RelationExtractionService {

    private final KgEntityRepository entityRepository;
    private final KgRelationRepository relationRepository;
    private final ChatLanguageModel chatLanguageModel;

    public RelationExtractionService(KgEntityRepository entityRepository,
                                     KgRelationRepository relationRepository,
                                     @Qualifier("kgChatLanguageModel") ChatLanguageModel chatLanguageModel) {
        this.entityRepository = entityRepository;
        this.relationRepository = relationRepository;
        this.chatLanguageModel = chatLanguageModel;
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transactional
    public void extractRuleBasedRelations(UUID workspaceId) {
        List<KgEntity> entities = entityRepository.findByWorkspaceId(workspaceId);
        List<KgRelation> newRelations = new ArrayList<>();

        // same_as: 다른 문서에서 같은 normalizedName + entityType
        Map<String, List<KgEntity>> grouped = entities.stream()
                .collect(Collectors.groupingBy(e -> e.getNormalizedName() + "|" + e.getEntityType().name()));

        for (Map.Entry<String, List<KgEntity>> entry : grouped.entrySet()) {
            List<KgEntity> group = entry.getValue();
            if (group.size() < 2) continue;

            for (int i = 0; i < group.size(); i++) {
                for (int j = i + 1; j < group.size(); j++) {
                    KgEntity a = group.get(i);
                    KgEntity b = group.get(j);
                    if (Objects.equals(a.getDocumentId(), b.getDocumentId())) continue;
                    if (relationExists(a.getId(), b.getId(), RelationType.SAME_AS)) continue;

                    newRelations.add(KgRelation.builder()
                            .workspaceId(workspaceId)
                            .sourceEntityId(a.getId())
                            .targetEntityId(b.getId())
                            .relationType(RelationType.SAME_AS)
                            .description("같은 지표 (" + a.getNormalizedName() + ")")
                            .confidence(new BigDecimal("0.95"))
                            .build());
                }
            }
        }

        // belongs_to: metric with period → matching date in same document
        Map<UUID, List<KgEntity>> byDocument = entities.stream()
                .filter(e -> e.getDocumentId() != null)
                .collect(Collectors.groupingBy(KgEntity::getDocumentId));

        for (List<KgEntity> docEntities : byDocument.values()) {
            List<KgEntity> metrics = docEntities.stream()
                    .filter(e -> e.getEntityType() == EntityType.METRIC && e.getPeriod() != null)
                    .toList();
            List<KgEntity> dates = docEntities.stream()
                    .filter(e -> e.getEntityType() == EntityType.DATE)
                    .toList();

            for (KgEntity metric : metrics) {
                for (KgEntity date : dates) {
                    if (metric.getPeriod() != null && date.getName() != null
                            && metric.getPeriod().contains(date.getName())) {
                        if (relationExists(metric.getId(), date.getId(), RelationType.BELONGS_TO)) continue;

                        newRelations.add(KgRelation.builder()
                                .workspaceId(workspaceId)
                                .sourceEntityId(metric.getId())
                                .targetEntityId(date.getId())
                                .relationType(RelationType.BELONGS_TO)
                                .description(metric.getNormalizedName() + " → " + date.getName())
                                .confidence(new BigDecimal("0.90"))
                                .build());
                    }
                }
            }
        }

        relationRepository.saveAll(newRelations);
        log.info("[KG] Rule-based relations created: {} for workspace {}", newRelations.size(), workspaceId);
    }

    @Transactional
    public void extractLlmBasedRelations(UUID workspaceId) {
        List<KgEntity> entities = entityRepository.findByWorkspaceId(workspaceId);
        if (entities.size() < 10) {
            log.info("[KG] Skipping LLM relation extraction — only {} entities (< 10)", entities.size());
            return;
        }

        List<KgEntity> targets = entities.stream()
                .filter(e -> e.getEntityType() == EntityType.METRIC || e.getEntityType() == EntityType.AMOUNT)
                .limit(30)
                .toList();

        if (targets.size() < 2) return;

        String entityList = targets.stream()
                .map(e -> "- " + e.getNormalizedName() + " (" + e.getEntityType() + ")"
                        + (e.getValue() != null ? " = " + e.getValue() : "")
                        + (e.getPeriod() != null ? " [" + e.getPeriod() + "]" : ""))
                .collect(Collectors.joining("\n"));

        String prompt = """
                다음 엔티티들 간의 관계를 분석해주세요.

                엔티티 목록:
                %s

                관계 유형:
                - IMPACTS: A가 B에 영향을 미침
                - DERIVED_FROM: A가 B로부터 계산됨
                - COMPARES_TO: A와 B가 비교 대상

                JSON 배열로만 응답. 확실한 관계만.
                [{"source": "엔티티명", "target": "엔티티명", "relation_type": "IMPACTS", "description": "설명"}]
                """.formatted(entityList);

        try {
            ChatRequest chatRequest = ChatRequest.builder()
                    .messages(List.of(UserMessage.from(prompt)))
                    .build();
            ChatResponse chatResponse = chatLanguageModel.chat(chatRequest);
            String response = chatResponse.aiMessage().text();

            List<RawRelation> parsed = parseRelationResponse(response);

            Map<String, KgEntity> nameToEntity = new HashMap<>();
            for (KgEntity e : targets) {
                nameToEntity.putIfAbsent(e.getNormalizedName(), e);
            }

            List<KgRelation> newRelations = new ArrayList<>();
            for (RawRelation raw : parsed) {
                KgEntity source = nameToEntity.get(raw.source);
                KgEntity target = nameToEntity.get(raw.target);
                if (source == null || target == null) continue;
                if (source.getId().equals(target.getId())) continue;

                RelationType type = parseRelationType(raw.getRelationType());
                if (type == null) continue;
                if (relationExists(source.getId(), target.getId(), type)) continue;

                newRelations.add(KgRelation.builder()
                        .workspaceId(workspaceId)
                        .sourceEntityId(source.getId())
                        .targetEntityId(target.getId())
                        .relationType(type)
                        .description(raw.description)
                        .confidence(new BigDecimal("0.70"))
                        .build());
            }

            relationRepository.saveAll(newRelations);
            log.info("[KG] LLM-based relations created: {} for workspace {}", newRelations.size(), workspaceId);

        } catch (Exception e) {
            log.error("[KG] LLM relation extraction failed for workspace {}", workspaceId, e);
        }
    }

    private boolean relationExists(UUID sourceId, UUID targetId, RelationType type) {
        return relationRepository
                .findBySourceEntityIdAndTargetEntityIdAndRelationType(sourceId, targetId, type)
                .isPresent();
    }

    private RelationType parseRelationType(String raw) {
        if (raw == null) return null;
        try { return RelationType.valueOf(raw.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private List<RawRelation> parseRelationResponse(String response) {
        try {
            String json = response.trim();
            if (json.contains("[")) {
                json = json.substring(json.indexOf('['), json.lastIndexOf(']') + 1);
            }
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[KG] Failed to parse LLM relation response: {}", e.getMessage());
            return List.of();
        }
    }

    static class RawRelation {
        public String source;
        public String target;
        public String relation_type;
        public String relationType;
        public String description;

        public String getRelationType() {
            return relation_type != null ? relation_type : relationType;
        }
    }
}
