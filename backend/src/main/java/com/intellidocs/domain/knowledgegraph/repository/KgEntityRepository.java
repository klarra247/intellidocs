package com.intellidocs.domain.knowledgegraph.repository;

import com.intellidocs.domain.knowledgegraph.entity.EntityType;
import com.intellidocs.domain.knowledgegraph.entity.KgEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface KgEntityRepository extends JpaRepository<KgEntity, UUID> {

    List<KgEntity> findByWorkspaceId(UUID workspaceId);

    List<KgEntity> findByDocumentId(UUID documentId);

    List<KgEntity> findByWorkspaceIdAndEntityType(UUID workspaceId, EntityType entityType);

    List<KgEntity> findByWorkspaceIdAndEntityTypeIn(UUID workspaceId, List<EntityType> entityTypes);

    List<KgEntity> findByWorkspaceIdAndDocumentIdIn(UUID workspaceId, List<UUID> documentIds);

    @Query("SELECT e FROM KgEntity e WHERE e.workspaceId = :wsId " +
           "AND LOWER(e.normalizedName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<KgEntity> searchByNormalizedName(@Param("wsId") UUID workspaceId,
                                          @Param("query") String query);

    List<KgEntity> findByWorkspaceIdAndNormalizedNameAndEntityType(
            UUID workspaceId, String normalizedName, EntityType entityType);

    void deleteByDocumentId(UUID documentId);

    @Query("SELECT COUNT(e) FROM KgEntity e WHERE e.workspaceId = :wsId")
    long countByWorkspaceId(@Param("wsId") UUID workspaceId);

    @Query("SELECT e.entityType, COUNT(e) FROM KgEntity e " +
           "WHERE e.workspaceId = :wsId GROUP BY e.entityType")
    List<Object[]> countByWorkspaceIdGroupByType(@Param("wsId") UUID workspaceId);

    boolean existsByDocumentId(UUID documentId);
}
