package com.intellidocs.domain.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

public class ChatSessionDto {

    @Builder
    public record SessionSummary(
            UUID id,
            String title,
            UUID creatorId,
            String creatorName,
            boolean isShared,
            boolean isOwner,
            long messageCount,
            LocalDateTime lastMessageAt,
            long unreadCount,
            LocalDateTime createdAt
    ) {}

    public record ShareResponse(
            boolean isShared,
            LocalDateTime sharedAt
    ) {}

    public record ReadStatusRequest(
            @NotNull UUID lastReadMessageId
    ) {}

    public record ReadStatusResponse(
            UUID sessionId,
            UUID lastReadMessageId,
            LocalDateTime lastReadAt
    ) {}
}
