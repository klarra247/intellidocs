package com.intellidocs.domain.document.repository;

import com.intellidocs.domain.document.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndex(UUID documentId);

    void deleteByDocumentId(UUID documentId);

    long countByDocumentId(UUID documentId);

    Optional<DocumentChunk> findByDocumentIdAndChunkIndex(UUID documentId, Integer chunkIndex);

    List<DocumentChunk> findByDocumentIdAndChunkIndexIn(UUID documentId, List<Integer> chunkIndices);
}