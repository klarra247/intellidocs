package com.intellidocs.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    private UUID workspaceId;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private FileType fileType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private String storagePath;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.UPLOADING;

    private Integer totalPages;
    private Integer totalChunks;
    private String errorMessage;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.NONE;

    private UUID reviewRequestedBy;
    private LocalDateTime reviewRequestedAt;
    private UUID reviewedBy;
    private LocalDateTime reviewedAt;

    private UUID versionGroupId;

    @Column(nullable = false)
    @Builder.Default
    private Integer versionNumber = 1;

    private UUID parentVersionId;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DocumentChunk> chunks = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    private void ensureCreatedAt() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // === Domain Methods ===

    public void startParsing() {
        this.status = DocumentStatus.PARSING;
    }

    public void startIndexing() {
        this.status = DocumentStatus.INDEXING;
    }

    public void completeIndexing(int totalPages, int totalChunks) {
        this.status = DocumentStatus.INDEXED;
        this.totalPages = totalPages;
        this.totalChunks = totalChunks;
    }

    public void fail(String errorMessage) {
        this.status = DocumentStatus.FAILED;
        this.errorMessage = errorMessage;
    }

    public void requestReview(UUID userId) {
        this.reviewStatus = ReviewStatus.IN_REVIEW;
        this.reviewRequestedBy = userId;
        this.reviewRequestedAt = LocalDateTime.now();
        this.reviewedBy = null;
        this.reviewedAt = null;
    }

    public void applyReview(ReviewStatus status, UUID userId) {
        this.reviewStatus = status;
        this.reviewedBy = userId;
        this.reviewedAt = LocalDateTime.now();
    }

    public void setVersionInfo(UUID versionGroupId, int versionNumber, UUID parentVersionId) {
        this.versionGroupId = versionGroupId;
        this.versionNumber = versionNumber;
        this.parentVersionId = parentVersionId;
    }
}