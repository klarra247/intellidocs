package com.intellidocs.domain.knowledgegraph.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_metrics")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "metric_name", nullable = false, length = 200)
    private String metricName;

    @Column(name = "normalized_metric", nullable = false, length = 200)
    private String normalizedMetric;

    @Column(length = 100)
    private String value;

    @Column(name = "numeric_value")
    private BigDecimal numericValue;

    @Column(length = 20)
    private String unit;

    @Column(length = 50)
    private String period;

    @Column(name = "chunk_index")
    private Integer chunkIndex;

    @Column(name = "page_number")
    private Integer pageNumber;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
