package com.intellidocs.domain.notification.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.notification.entity.Notification;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;

    private NotificationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID senderId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new NotificationService(notificationRepository, userRepository);
    }

    @Test
    void createNotification_success() {
        service.createNotification(userId, senderId, workspaceId,
                NotificationType.COMMENT_ADDED, "title", "msg", "chat_message", UUID.randomUUID());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void createNotification_skipWhenSenderEqualsRecipient() {
        service.createNotification(userId, userId, workspaceId,
                NotificationType.COMMENT_ADDED, "title", "msg", "chat_message", UUID.randomUUID());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void createBulkNotifications_excludesSender() {
        UUID member1 = UUID.randomUUID();
        UUID member2 = UUID.randomUUID();
        List<UUID> recipients = List.of(member1, senderId, member2);

        service.createBulkNotifications(recipients, senderId, workspaceId,
                NotificationType.SESSION_SHARED, "title", null, "chat_session", UUID.randomUUID());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());

        List<Notification> saved = captor.getValue();
        assertThat(saved).hasSize(2);
        assertThat(saved).noneMatch(n -> n.getRecipientId().equals(senderId));
    }

    @Test
    void getUnreadCount_returnsCount() {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(userId)).thenReturn(5L);
        var result = service.getUnreadCount(userId);
        assertThat(result.getCount()).isEqualTo(5);
    }

    @Test
    void markAsRead_success() {
        UUID notifId = UUID.randomUUID();
        Notification notification = Notification.builder().recipientId(userId).build();
        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notification));

        service.markAsRead(notifId, userId);

        assertThat(notification.getIsRead()).isTrue();
    }

    @Test
    void markAsRead_forbiddenForOtherUser() {
        UUID notifId = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        Notification notification = Notification.builder().recipientId(userId).build();
        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> service.markAsRead(notifId, otherUser))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void markAllAsRead_returnsUpdatedCount() {
        when(notificationRepository.markAllAsRead(userId)).thenReturn(3);
        var result = service.markAllAsRead(userId);
        assertThat(result.getUpdatedCount()).isEqualTo(3);
    }

    @Test
    void getNotifications_clampsPageSize() {
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(eq(userId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(notificationRepository.countByRecipientIdAndIsReadFalse(userId)).thenReturn(0L);

        var result = service.getNotifications(userId, 0, 100, null);
        assertThat(result.getSize()).isEqualTo(50);
    }
}
