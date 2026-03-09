package com.intellidocs.domain.report.repository;

import com.intellidocs.domain.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Report> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
