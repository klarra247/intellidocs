package com.intellidocs.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_chunks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(nullable = false)
    private Integer chunkIndex;

    private Integer pageNumber;

    @Column(nullable = false)
    private Integer tokenCount;

    @Column(columnDefinition = "TEXT")
    private String sectionTitle;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ChunkType chunkType = ChunkType.TEXT;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum ChunkType {
        TEXT,
        TABLE
    }
}