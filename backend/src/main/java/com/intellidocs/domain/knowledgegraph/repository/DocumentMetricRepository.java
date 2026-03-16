package com.intellidocs.domain.knowledgegraph.repository;

import com.intellidocs.domain.knowledgegraph.entity.DocumentMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentMetricRepository extends JpaRepository<DocumentMetric, UUID> {

    List<DocumentMetric> findByWorkspaceId(UUID workspaceId);

    List<DocumentMetric> findByDocumentId(UUID documentId);

    List<DocumentMetric> findByWorkspaceIdAndDocumentIdIn(UUID workspaceId, List<UUID> documentIds);

    void deleteByDocumentId(UUID documentId);

    @Query("SELECT dm FROM DocumentMetric dm WHERE dm.workspaceId = :wsId " +
           "AND LOWER(dm.normalizedMetric) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<DocumentMetric> searchByNormalizedMetric(@Param("wsId") UUID workspaceId,
                                                   @Param("query") String query);

    @Query("SELECT COUNT(dm) FROM DocumentMetric dm WHERE dm.workspaceId = :wsId")
    long countByWorkspaceId(@Param("wsId") UUID workspaceId);

    @Query("SELECT dm.normalizedMetric, COUNT(DISTINCT dm.documentId) FROM DocumentMetric dm " +
           "WHERE dm.workspaceId = :wsId GROUP BY dm.normalizedMetric")
    List<Object[]> countDocumentsPerMetric(@Param("wsId") UUID workspaceId);

    boolean existsByDocumentId(UUID documentId);
}
