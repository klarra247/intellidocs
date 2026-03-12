package com.intellidocs.domain.knowledgegraph.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "entity_relations",
       uniqueConstraints = @UniqueConstraint(
           columnNames = {"source_entity_id", "target_entity_id", "relation_type"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class KgRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "source_entity_id", nullable = false)
    private UUID sourceEntityId;

    @Column(name = "target_entity_id", nullable = false)
    private UUID targetEntityId;

    @Column(name = "relation_type", nullable = false, length = 100)
    @Enumerated(EnumType.STRING)
    private RelationType relationType;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(precision = 3, scale = 2)
    private BigDecimal confidence = new BigDecimal("0.80");

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public void updateConfidence(BigDecimal newConfidence) {
        this.confidence = newConfidence;
    }
}
