package com.intellidocs.domain.document.dto;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentDto {

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
        private LocalDateTime createdAt;

        public static ListResponse from(Document doc) {
            return ListResponse.builder()
                    .id(doc.getId())
                    .originalFilename(doc.getOriginalFilename())
                    .fileType(doc.getFileType())
                    .fileSize(doc.getFileSize())
                    .status(doc.getStatus())
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