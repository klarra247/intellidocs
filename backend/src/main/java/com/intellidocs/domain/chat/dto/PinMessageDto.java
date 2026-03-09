package com.intellidocs.domain.chat.dto;

import com.intellidocs.domain.chat.entity.ChatMessage;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class PinMessageDto {

    public record PinResponse(
            UUID messageId,
            boolean isPinned,
            UUID pinnedBy,
            LocalDateTime pinnedAt
    ) {}

    @Builder
    public record PinnedMessageResponse(
            UUID id,
            String role,
            String content,
            List<ChatMessage.SourceChunk> sourceChunks,
            Double confidence,
            boolean isPinned,
            UUID pinnedBy,
            LocalDateTime pinnedAt,
            LocalDateTime createdAt
    ) {}
}
