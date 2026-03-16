package com.intellidocs.domain.notification.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.notification.dto.NotificationDto;
import com.intellidocs.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<NotificationDto.ListResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean isRead) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getNotifications(userId, page, size, isRead)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<NotificationDto.UnreadCountResponse>> getUnreadCount() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getUnreadCount(userId)));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID notificationId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        notificationService.markAsRead(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<NotificationDto.MarkAllReadResponse>> markAllAsRead() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(notificationService.markAllAsRead(userId)));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable UUID notificationId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        notificationService.deleteNotification(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
