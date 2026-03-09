package com.intellidocs.domain.chat.dto;

import com.intellidocs.domain.chat.entity.ChatMessage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class ChatHistoryResponse {
    private UUID sessionId;
    private String title;
    private LocalDateTime createdAt;
    private List<MessageDto> messages;

    @Getter
    @Builder
    public static class MessageDto {
        private UUID id;
        private String role;
        private String content;
        private List<ChatMessage.SourceChunk> sourceChunks;
        private List<ChatMessage.SelectedDocument> selectedDocuments;
        private Double confidence;
        private boolean isPinned;
        private UUID pinnedBy;
        private LocalDateTime pinnedAt;
        private long commentCount;
        private LocalDateTime createdAt;
    }
}
