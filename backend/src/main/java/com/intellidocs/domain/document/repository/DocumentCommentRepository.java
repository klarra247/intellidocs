package com.intellidocs.domain.document.repository;

import com.intellidocs.domain.document.entity.DocumentComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentCommentRepository extends JpaRepository<DocumentComment, UUID> {

    List<DocumentComment> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);

    List<DocumentComment> findByDocumentIdAndResolvedOrderByCreatedAtAsc(UUID documentId, boolean resolved);

    long countByDocumentId(UUID documentId);

    @Query("SELECT dc.documentId, COUNT(dc) FROM DocumentComment dc " +
           "WHERE dc.documentId IN :docIds AND (dc.resolved IS NULL OR dc.resolved = false) " +
           "GROUP BY dc.documentId")
    List<Object[]> countUnresolvedByDocumentIds(@Param("docIds") List<UUID> docIds);
}
