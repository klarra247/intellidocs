package com.intellidocs.infrastructure.rabbitmq;

import lombok.*;

import java.util.List;
import java.util.UUID;

public class ParsingMessage {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParseRequest {
        private UUID documentId;
        private String filename;
        private String fileType;
        private String storagePath;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParseResult {
        private UUID documentId;
        private boolean success;
        private String errorMessage;
        private Integer totalPages;
        private List<ChunkData> chunks;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChunkData {
        private int chunkIndex;
        private String text;
        private Integer pageNumber;
        private String sectionTitle;
        private String chunkType; // TEXT or TABLE
        private int tokenCount;
    }
}