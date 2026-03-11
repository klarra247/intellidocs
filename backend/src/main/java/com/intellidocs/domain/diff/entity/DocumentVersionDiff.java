package com.intellidocs.domain.diff.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_version_diffs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentVersionDiff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID sourceDocumentId;

    @Column(nullable = false)
    private UUID targetDocumentId;

    private UUID workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DiffType diffType = DiffType.VERSION;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DiffStatus status = DiffStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private DiffResultData resultData;

    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // === Domain Methods ===

    public void startComparing() {
        this.status = DiffStatus.COMPARING;
    }

    public void complete(DiffResultData data) {
        this.status = DiffStatus.COMPLETED;
        this.resultData = data;
    }

    public void fail(String msg) {
        this.status = DiffStatus.FAILED;
        this.errorMessage = msg;
    }
}
