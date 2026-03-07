package com.intellidocs.domain.document.dto;

import com.intellidocs.domain.document.entity.DocumentChunk;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

public class ChunkDto {

    @Getter
    @Builder
    public static class Response {
        private UUID documentId;
        private String originalFilename;
        private Integer chunkIndex;
        private String text;
        private Integer pageNumber;
        private String sectionTitle;
        private DocumentChunk.ChunkType chunkType;
        private Integer tokenCount;
        private String warning;

        public static Response from(DocumentChunk chunk, String text) {
            return Response.builder()
                    .documentId(chunk.getDocument().getId())
                    .originalFilename(chunk.getDocument().getOriginalFilename())
                    .chunkIndex(chunk.getChunkIndex())
                    .text(text)
                    .pageNumber(chunk.getPageNumber())
                    .sectionTitle(chunk.getSectionTitle())
                    .chunkType(chunk.getChunkType())
                    .tokenCount(chunk.getTokenCount())
                    .build();
        }

        public static Response from(DocumentChunk chunk, String text, String warning) {
            return Response.builder()
                    .documentId(chunk.getDocument().getId())
                    .originalFilename(chunk.getDocument().getOriginalFilename())
                    .chunkIndex(chunk.getChunkIndex())
                    .text(text)
                    .pageNumber(chunk.getPageNumber())
                    .sectionTitle(chunk.getSectionTitle())
                    .chunkType(chunk.getChunkType())
                    .tokenCount(chunk.getTokenCount())
                    .warning(warning)
                    .build();
        }
    }

    @Getter
    @Builder
    public static class BulkResponse {
        private UUID documentId;
        private List<Response> chunks;
        private List<Integer> notFound;
    }
}
