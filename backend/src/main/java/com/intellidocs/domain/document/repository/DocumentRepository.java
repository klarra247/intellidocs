package com.intellidocs.domain.document.repository;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Document> findByUserIdAndStatus(UUID userId, DocumentStatus status);

    long countByUserId(UUID userId);
}