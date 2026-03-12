package com.intellidocs.domain.knowledgegraph.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.knowledgegraph.dto.KnowledgeGraphDto;
import com.intellidocs.domain.knowledgegraph.entity.*;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.domain.knowledgegraph.repository.KgRelationRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeGraphService {

    private final KgEntityRepository entityRepository;
    private final KgRelationRepository relationRepository;
    private final DocumentRepository documentRepository;
    private final QdrantChunkRetrievalService qdrantService;
    private final KgExtractionAsyncExecutor asyncExecutor;

    private static final int MAX_NODES = 200;
    private static final int MAX_EDGES = 500;

    private final Set<UUID> rebuildingWorkspaces = ConcurrentHashMap.newKeySet();

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.GraphResponse getGraph(UUID workspaceId,
                                                     List<String> entityTypes,
                                                     List<UUID> documentIds) {
        List<KgEntity> entities;
        if (documentIds != null && !documentIds.isEmpty()) {
            entities = entityRepository.findByWorkspaceIdAndDocumentIdIn(workspaceId, documentIds);
        } else if (entityTypes != null && !entityTypes.isEmpty()) {
            List<EntityType> types = entityTypes.stream()
                    .map(this::parseEntityType)
                    .filter(Objects::nonNull)
                    .toList();
            entities = types.isEmpty()
                    ? entityRepository.findByWorkspaceId(workspaceId)
                    : entityRepository.findByWorkspaceIdAndEntityTypeIn(workspaceId, types);
        } else {
            entities = entityRepository.findByWorkspaceId(workspaceId);
        }

        if (entities.size() > MAX_NODES) {
            entities = entities.subList(0, MAX_NODES);
        }

        Set<UUID> docIds = entities.stream()
                .map(KgEntity::getDocumentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, Document> docMap = documentRepository.findAllById(docIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        List<KnowledgeGraphDto.Node> nodes = new ArrayList<>();
        for (KgEntity e : entities) {
            Document doc = e.getDocumentId() != null ? docMap.get(e.getDocumentId()) : null;
            nodes.add(toNode(e, doc));
        }

        for (Document doc : docMap.values()) {
            nodes.add(KnowledgeGraphDto.Node.builder()
                    .id(doc.getId())
                    .type("document")
                    .name(doc.getOriginalFilename())
                    .fileType(doc.getFileType().name())
                    .status(doc.getStatus().name())
                    .build());
        }

        List<UUID> entityIds = entities.stream().map(KgEntity::getId).toList();
        List<KgRelation> relations = entityIds.isEmpty()
                ? List.of()
                : relationRepository.findByEntityIds(entityIds);

        if (relations.size() > MAX_EDGES) {
            relations = relations.subList(0, MAX_EDGES);
        }

        List<KnowledgeGraphDto.Edge> edges = relations.stream()
                .map(this::toEdge)
                .toList();

        Map<String, Long> typeStats = entities.stream()
                .collect(Collectors.groupingBy(e -> e.getEntityType().name(), Collectors.counting()));

        return KnowledgeGraphDto.GraphResponse.builder()
                .nodes(nodes)
                .edges(edges)
                .stats(KnowledgeGraphDto.Stats.builder()
                        .totalNodes(nodes.size())
                        .totalEdges(edges.size())
                        .entityTypes(typeStats)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.EntityDetailResponse getEntityDetail(UUID entityId, UUID workspaceId) {
        KgEntity entity = entityRepository.findById(entityId)
                .orElseThrow(() -> BusinessException.notFound("Entity", entityId));

        if (!entity.getWorkspaceId().equals(workspaceId)) {
            throw BusinessException.forbidden("해당 워크스페이스의 엔티티가 아닙니다");
        }

        List<KgRelation> relations = relationRepository.findByEntityId(entityId);
        Set<UUID> relatedIds = new HashSet<>();
        for (KgRelation r : relations) {
            relatedIds.add(r.getSourceEntityId());
            relatedIds.add(r.getTargetEntityId());
        }
        relatedIds.remove(entityId);

        List<KgEntity> relatedEntities = relatedIds.isEmpty()
                ? List.of()
                : entityRepository.findAllById(relatedIds);

        Map<UUID, Document> docMap = documentRepository.findAllById(
                relatedEntities.stream().map(KgEntity::getDocumentId)
                        .filter(Objects::nonNull).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Document::getId, d -> d));

        String chunkText = null;
        if (entity.getDocumentId() != null && entity.getChunkIndex() != null) {
            chunkText = qdrantService.getChunkText(entity.getDocumentId(), entity.getChunkIndex())
                    .orElse(null);
        }

        Document sourceDoc = entity.getDocumentId() != null
                ? documentRepository.findById(entity.getDocumentId()).orElse(null)
                : null;

        return KnowledgeGraphDto.EntityDetailResponse.builder()
                .entity(toNode(entity, sourceDoc))
                .relatedEntities(relatedEntities.stream()
                        .map(e -> toNode(e, docMap.get(e.getDocumentId())))
                        .toList())
                .sourceChunkText(chunkText)
                .document(sourceDoc != null ? KnowledgeGraphDto.DocumentInfo.builder()
                        .id(sourceDoc.getId())
                        .filename(sourceDoc.getOriginalFilename())
                        .fileType(sourceDoc.getFileType().name())
                        .status(sourceDoc.getStatus().name())
                        .build() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.SearchResponse searchEntities(UUID workspaceId, String query) {
        List<KgEntity> entities = entityRepository.searchByNormalizedName(workspaceId, query);
        Map<UUID, Document> docMap = documentRepository.findAllById(
                entities.stream().map(KgEntity::getDocumentId)
                        .filter(Objects::nonNull).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Document::getId, d -> d));

        return KnowledgeGraphDto.SearchResponse.builder()
                .entities(entities.stream()
                        .map(e -> toNode(e, docMap.get(e.getDocumentId())))
                        .toList())
                .build();
    }

    public KnowledgeGraphDto.RebuildResponse rebuild(UUID workspaceId) {
        if (!rebuildingWorkspaces.add(workspaceId)) {
            throw BusinessException.conflict("이미 재구축이 진행 중입니다");
        }

        List<Document> indexed = documentRepository.findByWorkspaceIdAndStatus(workspaceId, DocumentStatus.INDEXED);
        if (indexed.isEmpty()) {
            rebuildingWorkspaces.remove(workspaceId);
            throw BusinessException.badRequest("추출할 문서가 없습니다");
        }

        for (Document doc : indexed) {
            asyncExecutor.extractAndBuildRelations(doc.getId(), workspaceId);
        }

        rebuildingWorkspaces.remove(workspaceId);

        return KnowledgeGraphDto.RebuildResponse.builder()
                .status("PROCESSING")
                .message("총 " + indexed.size() + "개 문서에서 엔티티 추출을 시작합니다")
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.StatsResponse getStats(UUID workspaceId) {
        long totalEntities = entityRepository.countByWorkspaceId(workspaceId);
        long totalRelations = relationRepository.countByWorkspaceId(workspaceId);

        Map<String, Long> byType = new LinkedHashMap<>();
        for (Object[] row : entityRepository.countByWorkspaceIdGroupByType(workspaceId)) {
            byType.put(((EntityType) row[0]).name(), (Long) row[1]);
        }

        return KnowledgeGraphDto.StatsResponse.builder()
                .totalEntities(totalEntities)
                .totalRelations(totalRelations)
                .byType(byType)
                .build();
    }

    private KnowledgeGraphDto.Node toNode(KgEntity entity, Document doc) {
        return KnowledgeGraphDto.Node.builder()
                .id(entity.getId())
                .type("entity")
                .entityType(entity.getEntityType().name())
                .name(entity.getName())
                .normalizedName(entity.getNormalizedName())
                .value(entity.getValue())
                .period(entity.getPeriod())
                .documentId(entity.getDocumentId())
                .documentName(doc != null ? doc.getOriginalFilename() : null)
                .pageNumber(entity.getPageNumber())
                .build();
    }

    private KnowledgeGraphDto.Edge toEdge(KgRelation relation) {
        return KnowledgeGraphDto.Edge.builder()
                .id(relation.getId())
                .source(relation.getSourceEntityId())
                .target(relation.getTargetEntityId())
                .relationType(relation.getRelationType().name())
                .description(relation.getDescription())
                .confidence(relation.getConfidence())
                .build();
    }

    private EntityType parseEntityType(String raw) {
        try {
            return EntityType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
