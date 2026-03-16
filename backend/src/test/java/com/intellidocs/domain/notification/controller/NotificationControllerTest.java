package com.intellidocs.domain.notification.controller;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.notification.dto.NotificationDto;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.notification.service.NotificationService;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean NotificationService notificationService;
    @MockitoBean JwtService jwtService;
    @MockitoBean WorkspaceRepository workspaceRepository;
    @MockitoBean WorkspaceMemberRepository workspaceMemberRepository;

    @Test
    void getNotifications_success() throws Exception {
        var response = NotificationDto.ListResponse.builder()
                .notifications(List.of(
                        NotificationDto.Response.builder()
                                .id(UUID.randomUUID())
                                .type(NotificationType.COMMENT_ADDED)
                                .title("테스트 알림")
                                .isRead(false)
                                .createdAt(LocalDateTime.now())
                                .build()
                ))
                .totalCount(1)
                .unreadCount(1)
                .page(0)
                .size(20)
                .build();

        when(notificationService.getNotifications(any(), eq(0), eq(20), isNull()))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.notifications").isArray())
                .andExpect(jsonPath("$.data.totalCount").value(1))
                .andExpect(jsonPath("$.data.unreadCount").value(1));
    }

    @Test
    void getUnreadCount_success() throws Exception {
        when(notificationService.getUnreadCount(any()))
                .thenReturn(NotificationDto.UnreadCountResponse.builder().count(5).build());

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(5));
    }

    @Test
    void markAsRead_success() throws Exception {
        UUID notifId = UUID.randomUUID();
        doNothing().when(notificationService).markAsRead(any(), any());

        mockMvc.perform(patch("/api/v1/notifications/" + notifId + "/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void markAsRead_forbidden() throws Exception {
        UUID notifId = UUID.randomUUID();
        doThrow(BusinessException.forbidden("본인의 알림만 읽음 처리할 수 있습니다"))
                .when(notificationService).markAsRead(any(), any());

        mockMvc.perform(patch("/api/v1/notifications/" + notifId + "/read"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void markAllAsRead_success() throws Exception {
        when(notificationService.markAllAsRead(any()))
                .thenReturn(NotificationDto.MarkAllReadResponse.builder().updatedCount(3).build());

        mockMvc.perform(patch("/api/v1/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updatedCount").value(3));
    }

    @Test
    void deleteNotification_success() throws Exception {
        UUID notifId = UUID.randomUUID();
        doNothing().when(notificationService).deleteNotification(any(), any());

        mockMvc.perform(delete("/api/v1/notifications/" + notifId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
