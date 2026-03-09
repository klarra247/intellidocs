package com.intellidocs.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

public class CommentDto {

    public record CreateRequest(
            @NotBlank @Size(min = 1, max = 1000) String content
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(min = 1, max = 1000) String content
    ) {}

    @Builder
    public record CommentResponse(
            UUID id,
            UUID userId,
            String userName,
            String userProfileImage,
            String content,
            boolean isOwner,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
