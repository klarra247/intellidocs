package com.intellidocs.domain.document.dto;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.entity.ReviewStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentDto {

    @Getter
    @Builder
    public static class PageResponse {
        private List<ListResponse> content;
        private int currentPage;
        private int totalPages;
        private long totalElements;
    }

    @Getter
    @Builder
    public static class UploadResponse {
        private UUID documentId;
        private String filename;
        private FileType fileType;
        private DocumentStatus status;
    }

    @Getter
    @Builder
    public static class DetailResponse {
        private UUID id;
        private String filename;
        private String originalFilename;
        private FileType fileType;
        private Long fileSize;
        private DocumentStatus status;
        private Integer totalPages;
        private Integer totalChunks;
        private String errorMessage;
        private ReviewStatus reviewStatus;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static DetailResponse from(Document doc) {
            return DetailResponse.builder()
                    .id(doc.getId())
                    .filename(doc.getFilename())
                    .originalFilename(doc.getOriginalFilename())
                    .fileType(doc.getFileType())
                    .fileSize(doc.getFileSize())
                    .status(doc.getStatus())
                    .totalPages(doc.getTotalPages())
                    .totalChunks(doc.getTotalChunks())
                    .errorMessage(doc.getErrorMessage())
                    .reviewStatus(doc.getReviewStatus())
                    .createdAt(doc.getCreatedAt())
                    .updatedAt(doc.getUpdatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class ListResponse {
        private UUID id;
        private String originalFilename;
        private FileType fileType;
        private Long fileSize;
        private DocumentStatus status;
        private ReviewStatus reviewStatus;
        private UUID uploaderId;
        private LocalDateTime createdAt;

        public static ListResponse from(Document doc) {
            return ListResponse.builder()
                    .id(doc.getId())
                    .originalFilename(doc.getOriginalFilename())
                    .fileType(doc.getFileType())
                    .fileSize(doc.getFileSize())
                    .status(doc.getStatus())
                    .reviewStatus(doc.getReviewStatus())
                    .uploaderId(doc.getUserId())
                    .createdAt(doc.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class StatusEvent {
        private UUID documentId;
        private DocumentStatus status;
        private String message;
        private Integer progress; // 0-100
    }
}