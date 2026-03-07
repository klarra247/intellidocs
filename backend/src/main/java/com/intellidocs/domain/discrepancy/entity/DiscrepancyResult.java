package com.intellidocs.domain.discrepancy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "discrepancy_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DiscrepancyResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<UUID> documentIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> targetFields;

    @Column(precision = 5, scale = 4, nullable = false)
    @Builder.Default
    private BigDecimal tolerance = new BigDecimal("0.001");

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TriggerType triggerType = TriggerType.MANUAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DiscrepancyStatus status = DiscrepancyStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private DiscrepancyResultData resultData;

    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // === Domain Methods ===

    public void startDetecting() {
        this.status = DiscrepancyStatus.DETECTING;
    }

    public void complete(DiscrepancyResultData data) {
        this.status = DiscrepancyStatus.COMPLETED;
        this.resultData = data;
    }

    public void fail(String msg) {
        this.status = DiscrepancyStatus.FAILED;
        this.errorMessage = msg;
    }
}
