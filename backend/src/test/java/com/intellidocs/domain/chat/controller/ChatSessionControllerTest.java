package com.intellidocs.domain.chat.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.chat.dto.ChatSessionDto;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.service.ChatSessionSharingService;
import com.intellidocs.domain.chat.service.PinMessageService;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatSessionController.class)
@AutoConfigureMockMvc(addFilters = false)
class ChatSessionControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private ChatSessionSharingService chatSessionSharingService;
    @MockitoBean private PinMessageService pinMessageService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private WorkspaceRepository workspaceRepository;
    @MockitoBean private WorkspaceMemberRepository workspaceMemberRepository;

    @Test
    void shareSession_returnsOk() throws Exception {
        UUID sessionId = UUID.randomUUID();
        var response = new ChatSessionDto.ShareResponse(true, LocalDateTime.now());
        when(chatSessionSharingService.shareSession(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/chat/sessions/{sessionId}/share", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isShared").value(true));
    }

    @Test
    void shareSession_notCreator_returns403() throws Exception {
        UUID sessionId = UUID.randomUUID();
        when(chatSessionSharingService.shareSession(any(), any()))
                .thenThrow(BusinessException.forbidden("세션 생성자만 공유할 수 있습니다"));

        mockMvc.perform(post("/api/v1/chat/sessions/{sessionId}/share", sessionId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void shareSession_personalWorkspace_returns400() throws Exception {
        UUID sessionId = UUID.randomUUID();
        when(chatSessionSharingService.shareSession(any(), any()))
                .thenThrow(BusinessException.personalWorkspaceRestriction("세션 공유"));

        mockMvc.perform(post("/api/v1/chat/sessions/{sessionId}/share", sessionId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void unshareSession_returnsOk() throws Exception {
        UUID sessionId = UUID.randomUUID();
        var response = new ChatSessionDto.ShareResponse(false, null);
        when(chatSessionSharingService.unshareSession(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/chat/sessions/{sessionId}/unshare", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isShared").value(false));
    }

    @Test
    void getSessionList_returnsOk() throws Exception {
        var summary = ChatSessionDto.SessionSummary.builder()
                .id(UUID.randomUUID())
                .title("테스트")
                .isOwner(true)
                .messageCount(5)
                .unreadCount(0)
                .createdAt(LocalDateTime.now())
                .build();
        when(chatSessionSharingService.getSessionList(any(), any()))
                .thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/chat/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("테스트"));
    }

    @Test
    void updateReadStatus_returnsOk() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        var response = new ChatSessionDto.ReadStatusResponse(sessionId, messageId, LocalDateTime.now());
        when(chatSessionSharingService.updateReadStatus(any(), any(), any())).thenReturn(response);

        var request = new ChatSessionDto.ReadStatusRequest(messageId);

        mockMvc.perform(patch("/api/v1/chat/sessions/{sessionId}/read", sessionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getPinnedMessages_returnsOk() throws Exception {
        UUID sessionId = UUID.randomUUID();
        when(pinMessageService.getPinnedMessages(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/chat/sessions/{sessionId}/pinned", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }
}
