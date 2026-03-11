package com.intellidocs.domain.document.repository;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Document> findByUserIdAndStatus(UUID userId, DocumentStatus status);

    long countByUserId(UUID userId);

    List<Document> findByStatusOrderByCreatedAtDesc(DocumentStatus status);

    List<Document> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    Page<Document> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId, Pageable pageable);

    List<Document> findByWorkspaceIdAndStatus(UUID workspaceId, DocumentStatus status);

    List<Document> findByVersionGroupIdOrderByVersionNumberDesc(UUID versionGroupId);

    @Query("SELECT MAX(d.versionNumber) FROM Document d WHERE d.versionGroupId = :groupId")
    Optional<Integer> findMaxVersionNumber(@Param("groupId") UUID groupId);
}