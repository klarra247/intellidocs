package com.intellidocs.domain.notification.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.notification.dto.NotificationDto;
import com.intellidocs.domain.notification.entity.Notification;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int CLEANUP_DAYS = 90;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public Notification createNotification(UUID recipientId, UUID senderId, UUID workspaceId,
                                           NotificationType type, String title, String message,
                                           String referenceType, UUID referenceId) {
        if (senderId != null && senderId.equals(recipientId)) {
            return null;
        }

        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .senderId(senderId)
                .workspaceId(workspaceId)
                .notificationType(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .build();

        return notificationRepository.save(notification);
    }

    @Transactional
    public List<Notification> createBulkNotifications(List<UUID> recipientIds, UUID senderId, UUID workspaceId,
                                                       NotificationType type, String title, String message,
                                                       String referenceType, UUID referenceId) {
        List<Notification> notifications = recipientIds.stream()
                .filter(id -> !id.equals(senderId))
                .map(recipientId -> Notification.builder()
                        .recipientId(recipientId)
                        .senderId(senderId)
                        .workspaceId(workspaceId)
                        .notificationType(type)
                        .title(title)
                        .message(message)
                        .referenceType(referenceType)
                        .referenceId(referenceId)
                        .build())
                .toList();

        if (notifications.isEmpty()) {
            return List.of();
        }

        return notificationRepository.saveAll(notifications);
    }

    @Transactional(readOnly = true)
    public NotificationDto.ListResponse getNotifications(UUID userId, int page, int size, Boolean isRead) {
        page = Math.max(page, 0);
        size = Math.max(1, Math.min(size, MAX_PAGE_SIZE));

        Page<Notification> notificationPage;
        if (isRead != null) {
            notificationPage = notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(
                    userId, isRead, PageRequest.of(page, size));
        } else {
            notificationPage = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                    userId, PageRequest.of(page, size));
        }

        // Batch fetch sender info
        Set<UUID> senderIds = notificationPage.getContent().stream()
                .map(Notification::getSenderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, User> senderMap = senderIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(senderIds).stream()
                        .collect(Collectors.toMap(User::getId, Function.identity()));

        List<NotificationDto.Response> responses = notificationPage.getContent().stream()
                .map(n -> toResponse(n, senderMap))
                .toList();

        long unreadCount = notificationRepository.countByRecipientIdAndIsReadFalse(userId);

        return NotificationDto.ListResponse.builder()
                .notifications(responses)
                .totalCount(notificationPage.getTotalElements())
                .unreadCount(unreadCount)
                .page(page)
                .size(size)
                .build();
    }

    @Transactional(readOnly = true)
    public NotificationDto.UnreadCountResponse getUnreadCount(UUID userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        return NotificationDto.UnreadCountResponse.builder()
                .count(count)
                .build();
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> BusinessException.notFound("Notification", notificationId));

        if (!notification.getRecipientId().equals(userId)) {
            throw BusinessException.forbidden("알림에 대한 권한이 없습니다");
        }

        notification.markAsRead();
    }

    @Transactional
    public NotificationDto.MarkAllReadResponse markAllAsRead(UUID userId) {
        int updatedCount = notificationRepository.markAllAsRead(userId);
        return NotificationDto.MarkAllReadResponse.builder()
                .updatedCount(updatedCount)
                .build();
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> BusinessException.notFound("Notification", notificationId));

        if (!notification.getRecipientId().equals(userId)) {
            throw BusinessException.forbidden("알림에 대한 권한이 없습니다");
        }

        notificationRepository.delete(notification);
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(CLEANUP_DAYS);
        int deleted = notificationRepository.deleteOldReadNotifications(cutoff);
        if (deleted > 0) {
            log.info("Cleaned up {} old read notifications (older than {} days)", deleted, CLEANUP_DAYS);
        }
    }

    private NotificationDto.Response toResponse(Notification notification, Map<UUID, User> senderMap) {
        User sender = notification.getSenderId() != null ? senderMap.get(notification.getSenderId()) : null;

        return NotificationDto.Response.builder()
                .id(notification.getId())
                .type(notification.getNotificationType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .senderId(notification.getSenderId())
                .senderName(sender != null ? sender.getName() : null)
                .senderProfileImage(sender != null ? sender.getProfileImageUrl() : null)
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .workspaceId(notification.getWorkspaceId())
                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
