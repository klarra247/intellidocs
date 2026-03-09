package com.intellidocs.domain.chat.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.chat.dto.CommentDto;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.service.CommentService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatMessageController.class)
@AutoConfigureMockMvc(addFilters = false)
class ChatMessageControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private PinMessageService pinMessageService;
    @MockitoBean private CommentService commentService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private WorkspaceRepository workspaceRepository;
    @MockitoBean private WorkspaceMemberRepository workspaceMemberRepository;

    @Test
    void pinMessage_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        var response = new PinMessageDto.PinResponse(messageId, true, userId, LocalDateTime.now());
        when(pinMessageService.pinMessage(any(), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/chat/messages/{messageId}/pin", messageId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isPinned").value(true));
    }

    @Test
    void pinMessage_userMessage_returns400() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(pinMessageService.pinMessage(any(), any()))
                .thenThrow(BusinessException.cannotPinUserMessage());

        mockMvc.perform(patch("/api/v1/chat/messages/{messageId}/pin", messageId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void pinMessage_limitExceeded_returns400() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(pinMessageService.pinMessage(any(), any()))
                .thenThrow(BusinessException.pinLimitExceeded(10));

        mockMvc.perform(patch("/api/v1/chat/messages/{messageId}/pin", messageId))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unpinMessage_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        var response = new PinMessageDto.PinResponse(messageId, false, null, null);
        when(pinMessageService.unpinMessage(any(), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/chat/messages/{messageId}/unpin", messageId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isPinned").value(false));
    }

    @Test
    void createComment_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        var response = CommentDto.CommentResponse.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .userName("Dev User")
                .content("좋은 답변입니다")
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.createComment(any(), any(), any())).thenReturn(response);

        var request = new CommentDto.CreateRequest("좋은 답변입니다");

        mockMvc.perform(post("/api/v1/chat/messages/{messageId}/comments", messageId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.content").value("좋은 답변입니다"));
    }

    @Test
    void getComments_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(commentService.getComments(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/chat/messages/{messageId}/comments", messageId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void updateComment_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        var response = CommentDto.CommentResponse.builder()
                .id(commentId)
                .userId(UUID.randomUUID())
                .userName("Dev User")
                .content("수정된 코멘트")
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.updateComment(any(), any(), any(), any())).thenReturn(response);

        var request = new CommentDto.UpdateRequest("수정된 코멘트");

        mockMvc.perform(put("/api/v1/chat/messages/{messageId}/comments/{commentId}",
                        messageId, commentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("수정된 코멘트"));
    }

    @Test
    void deleteComment_returnsOk() throws Exception {
        UUID messageId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        doNothing().when(commentService).deleteComment(any(), any(), any());

        mockMvc.perform(delete("/api/v1/chat/messages/{messageId}/comments/{commentId}",
                        messageId, commentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteComment_forbidden_returns403() throws Exception {
        UUID messageId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        doThrow(BusinessException.forbidden("코멘트 삭제 권한이 없습니다"))
                .when(commentService).deleteComment(any(), any(), any());

        mockMvc.perform(delete("/api/v1/chat/messages/{messageId}/comments/{commentId}",
                        messageId, commentId))
                .andExpect(status().isForbidden());
    }
}
