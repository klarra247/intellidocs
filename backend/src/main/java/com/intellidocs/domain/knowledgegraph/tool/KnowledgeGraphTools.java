package com.intellidocs.domain.knowledgegraph.tool;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.domain.knowledgegraph.entity.KgEntity;
import com.intellidocs.domain.knowledgegraph.entity.KgRelation;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.domain.knowledgegraph.repository.KgRelationRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.repository.DocumentRepository;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class KnowledgeGraphTools {

    private final KgEntityRepository entityRepository;
    private final KgRelationRepository relationRepository;
    private final DocumentRepository documentRepository;

    @Tool("워크스페이스의 Knowledge Graph에서 엔티티 간 관계를 탐색한다. " +
          "'매출과 관련된 항목은?', '이 회사와 연결된 문서는?' 같은 질문에 사용")
    public String exploreKnowledgeGraph(
            @P("탐색할 엔티티 이름 또는 키워드") String query,
            @P("탐색 깊이: 1이면 직접 연결만, 2이면 2단계 연결까지") int depth) {

        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        if (workspaceId == null) {
            return "워크스페이스 컨텍스트가 없습니다.";
        }

        List<KgEntity> matched = entityRepository.searchByNormalizedName(workspaceId, query);
        if (matched.isEmpty()) {
            return "\"" + query + "\"와 관련된 엔티티를 찾을 수 없습니다.";
        }

        Set<UUID> allDocIds = new HashSet<>();
        matched.forEach(e -> { if (e.getDocumentId() != null) allDocIds.add(e.getDocumentId()); });

        List<UUID> matchedIds = matched.stream().map(KgEntity::getId).toList();
        List<KgRelation> directRelations = relationRepository.findByEntityIds(matchedIds);

        Set<UUID> relatedEntityIds = new HashSet<>();
        for (KgRelation r : directRelations) {
            relatedEntityIds.add(r.getSourceEntityId());
            relatedEntityIds.add(r.getTargetEntityId());
        }
        relatedEntityIds.removeAll(matchedIds);

        Map<UUID, KgEntity> entityMap = new HashMap<>();
        matched.forEach(e -> entityMap.put(e.getId(), e));
        if (!relatedEntityIds.isEmpty()) {
            entityRepository.findAllById(relatedEntityIds).forEach(e -> {
                entityMap.put(e.getId(), e);
                if (e.getDocumentId() != null) allDocIds.add(e.getDocumentId());
            });
        }

        List<KgRelation> secondRelations = List.of();
        if (depth >= 2 && !relatedEntityIds.isEmpty()) {
            secondRelations = relationRepository.findByEntityIds(new ArrayList<>(relatedEntityIds));
            Set<UUID> secondEntityIds = new HashSet<>();
            for (KgRelation r : secondRelations) {
                secondEntityIds.add(r.getSourceEntityId());
                secondEntityIds.add(r.getTargetEntityId());
            }
            secondEntityIds.removeAll(entityMap.keySet());
            if (!secondEntityIds.isEmpty()) {
                entityRepository.findAllById(secondEntityIds).forEach(e -> {
                    entityMap.put(e.getId(), e);
                    if (e.getDocumentId() != null) allDocIds.add(e.getDocumentId());
                });
            }
        }

        Map<UUID, Document> docMap = documentRepository.findAllById(allDocIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        StringBuilder sb = new StringBuilder();
        sb.append("## \"").append(query).append("\" 관련 Knowledge Graph\n\n");

        sb.append("### 직접 연결 (").append(directRelations.size()).append("건)\n");
        for (KgRelation r : directRelations) {
            UUID otherId = matchedIds.contains(r.getSourceEntityId())
                    ? r.getTargetEntityId() : r.getSourceEntityId();
            KgEntity other = entityMap.get(otherId);
            if (other == null) continue;

            Document doc = other.getDocumentId() != null ? docMap.get(other.getDocumentId()) : null;
            String docName = doc != null ? doc.getOriginalFilename() : "?";

            if (r.getRelationType().name().equals("SAME_AS")) {
                sb.append("- ").append(docName).append(" → ")
                        .append(other.getName());
                if (other.getValue() != null) sb.append(" ").append(other.getValue());
                if (other.getPeriod() != null) sb.append(" (").append(other.getPeriod()).append(")");
                sb.append("\n");
            } else {
                sb.append("- ").append(other.getNormalizedName())
                        .append(" (").append(r.getRelationType().name().toLowerCase())
                        .append(": ").append(r.getDescription() != null ? r.getDescription() : "").append(")\n");
            }
        }

        if (depth >= 2 && !secondRelations.isEmpty()) {
            sb.append("\n### 2단계 연결 (").append(secondRelations.size()).append("건)\n");
            for (KgRelation r : secondRelations) {
                KgEntity src = entityMap.get(r.getSourceEntityId());
                KgEntity tgt = entityMap.get(r.getTargetEntityId());
                if (src == null || tgt == null) continue;
                sb.append("- ").append(src.getNormalizedName())
                        .append(" → ").append(tgt.getNormalizedName())
                        .append(" (").append(r.getRelationType().name().toLowerCase()).append(")\n");
            }
        }

        log.info("[KG Tool] exploreKnowledgeGraph query='{}' depth={} results={}",
                query, depth, directRelations.size());
        return sb.toString();
    }
}
