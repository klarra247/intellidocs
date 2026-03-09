package com.intellidocs.domain.document.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentCommentDto {

    public record CreateRequest(
            @NotBlank @Size(min = 1, max = 2000) String content,
            @Min(0) Integer chunkIndex,
            @Min(1) Integer pageNumber
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(min = 1, max = 2000) String content
    ) {}

    @Builder
    public record CommentResponse(
            UUID id,
            UUID documentId,
            UUID userId,
            String userName,
            String userProfileImage,
            Integer chunkIndex,
            Integer pageNumber,
            String content,
            boolean resolved,
            UUID resolvedBy,
            String resolvedByName,
            LocalDateTime resolvedAt,
            boolean isOwner,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    @Builder
    public record CommentListResponse(
            List<CommentResponse> comments,
            long totalCount,
            long unresolvedCount
    ) {}
}
