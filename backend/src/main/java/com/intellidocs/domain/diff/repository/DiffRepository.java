package com.intellidocs.domain.diff.repository;

import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiffRepository extends JpaRepository<DocumentVersionDiff, UUID> {

    Optional<DocumentVersionDiff> findBySourceDocumentIdAndTargetDocumentId(UUID sourceId, UUID targetId);

    List<DocumentVersionDiff> findBySourceDocumentIdInOrTargetDocumentIdIn(List<UUID> sourceIds, List<UUID> targetIds);
}
