package com.intellidocs.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "chunk_index")
    private Integer chunkIndex;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void updateContent(String content) {
        this.content = content;
    }

    public boolean isOwnedBy(UUID userId) {
        return this.userId.equals(userId);
    }

    public void resolve(UUID userId) {
        this.resolved = true;
        this.resolvedBy = userId;
        this.resolvedAt = LocalDateTime.now();
    }

    public void unresolve() {
        this.resolved = false;
        this.resolvedBy = null;
        this.resolvedAt = null;
    }
}
