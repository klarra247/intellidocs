package com.intellidocs.domain.knowledgegraph.repository;

import com.intellidocs.domain.knowledgegraph.entity.KgRelation;
import com.intellidocs.domain.knowledgegraph.entity.RelationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KgRelationRepository extends JpaRepository<KgRelation, UUID> {

    List<KgRelation> findByWorkspaceId(UUID workspaceId);

    @Query("SELECT r FROM KgRelation r WHERE r.sourceEntityId = :entityId OR r.targetEntityId = :entityId")
    List<KgRelation> findByEntityId(@Param("entityId") UUID entityId);

    Optional<KgRelation> findBySourceEntityIdAndTargetEntityIdAndRelationType(
            UUID sourceEntityId, UUID targetEntityId, RelationType relationType);

    @Query("SELECT COUNT(r) FROM KgRelation r WHERE r.workspaceId = :wsId")
    long countByWorkspaceId(@Param("wsId") UUID workspaceId);

    @Query("SELECT r FROM KgRelation r WHERE r.sourceEntityId IN :entityIds OR r.targetEntityId IN :entityIds")
    List<KgRelation> findByEntityIds(@Param("entityIds") List<UUID> entityIds);

    void deleteBySourceEntityIdOrTargetEntityId(UUID sourceId, UUID targetId);
}
