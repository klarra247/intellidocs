package com.intellidocs.domain.report.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    private UUID workspaceId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ReportType reportType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    private String storagePath;

    private Long fileSize;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<UUID> documentIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private ReportData reportData;

    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    // === Domain Methods ===

    public void startGenerating() {
        this.status = ReportStatus.GENERATING;
    }

    public void startRendering() {
        this.status = ReportStatus.RENDERING;
    }

    public void complete(String path, long size, ReportData data) {
        this.status = ReportStatus.COMPLETED;
        this.storagePath = path;
        this.fileSize = size;
        this.reportData = data;
        this.completedAt = LocalDateTime.now();
    }

    public void fail(String msg) {
        this.status = ReportStatus.FAILED;
        this.errorMessage = msg;
    }
}
