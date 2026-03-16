package com.intellidocs.domain.notification.dto;

import com.intellidocs.domain.notification.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class NotificationDto {

    @Getter
    @Builder
    public static class Response {
        private UUID id;
        private NotificationType type;
        private String title;
        private String message;
        private UUID senderId;
        private String senderName;
        private String senderProfileImage;
        private String referenceType;
        private UUID referenceId;
        private UUID workspaceId;
        private boolean isRead;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    public static class ListResponse {
        private List<Response> notifications;
        private long totalCount;
        private long unreadCount;
        private int page;
        private int size;
    }

    @Getter
    @Builder
    public static class UnreadCountResponse {
        private long count;
    }

    @Getter
    @Builder
    public static class MarkAllReadResponse {
        private int updatedCount;
    }
}
