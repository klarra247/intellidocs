package com.intellidocs.domain.document.repository;

import com.intellidocs.domain.document.entity.DocumentComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentCommentRepository extends JpaRepository<DocumentComment, UUID> {

    List<DocumentComment> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);

    List<DocumentComment> findByDocumentIdAndResolvedOrderByCreatedAtAsc(UUID documentId, boolean resolved);

    long countByDocumentId(UUID documentId);
}
