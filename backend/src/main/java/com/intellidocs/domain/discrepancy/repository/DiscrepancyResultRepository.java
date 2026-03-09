package com.intellidocs.domain.discrepancy.repository;

import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyStatus;
import com.intellidocs.domain.discrepancy.entity.TriggerType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DiscrepancyResultRepository extends JpaRepository<DiscrepancyResult, UUID> {
    List<DiscrepancyResult> findByStatusOrderByCreatedAtDesc(DiscrepancyStatus status);
    List<DiscrepancyResult> findTop10ByOrderByCreatedAtDesc();
    List<DiscrepancyResult> findTop10ByTriggerTypeOrderByCreatedAtDesc(TriggerType triggerType);
    List<DiscrepancyResult> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
    List<DiscrepancyResult> findTop10ByUserIdAndTriggerTypeOrderByCreatedAtDesc(UUID userId, TriggerType triggerType);

    List<DiscrepancyResult> findTop10ByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
    List<DiscrepancyResult> findTop10ByWorkspaceIdAndTriggerTypeOrderByCreatedAtDesc(UUID workspaceId, TriggerType triggerType);
}
