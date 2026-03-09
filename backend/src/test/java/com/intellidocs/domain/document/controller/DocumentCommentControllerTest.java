package com.intellidocs.domain.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.document.dto.DocumentCommentDto;
import com.intellidocs.domain.document.service.DocumentCommentService;
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

@WebMvcTest(DocumentCommentController.class)
@AutoConfigureMockMvc(addFilters = false)
class DocumentCommentControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private DocumentCommentService commentService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private WorkspaceRepository workspaceRepository;
    @MockitoBean private WorkspaceMemberRepository workspaceMemberRepository;

    private static final UUID DOC_ID = UUID.randomUUID();

    @Test
    void createComment_returnsCreated() throws Exception {
        var response = DocumentCommentDto.CommentResponse.builder()
                .id(UUID.randomUUID())
                .documentId(DOC_ID)
                .userId(UUID.randomUUID())
                .userName("테스트 유저")
                .content("코멘트 내용")
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.createComment(any(), any(), any())).thenReturn(response);

        var request = new DocumentCommentDto.CreateRequest("코멘트 내용", null, null);

        mockMvc.perform(post("/api/v1/documents/{documentId}/comments", DOC_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.content").value("코멘트 내용"));
    }

    @Test
    void getComments_returnsOk() throws Exception {
        var listResponse = DocumentCommentDto.CommentListResponse.builder()
                .comments(List.of())
                .totalCount(0)
                .unresolvedCount(0)
                .build();
        when(commentService.getComments(any(), any(), any())).thenReturn(listResponse);

        mockMvc.perform(get("/api/v1/documents/{documentId}/comments", DOC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.comments").isArray());
    }

    @Test
    void getComments_withResolvedFilter_returnsOk() throws Exception {
        var listResponse = DocumentCommentDto.CommentListResponse.builder()
                .comments(List.of())
                .totalCount(0)
                .unresolvedCount(0)
                .build();
        when(commentService.getComments(any(), eq(false), any())).thenReturn(listResponse);

        mockMvc.perform(get("/api/v1/documents/{documentId}/comments", DOC_ID)
                        .param("resolved", "false"))
                .andExpect(status().isOk());
    }

    @Test
    void updateComment_returnsOk() throws Exception {
        UUID commentId = UUID.randomUUID();
        var response = DocumentCommentDto.CommentResponse.builder()
                .id(commentId)
                .documentId(DOC_ID)
                .userId(UUID.randomUUID())
                .userName("테스트 유저")
                .content("수정된 코멘트")
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.updateComment(any(), any(), any(), any())).thenReturn(response);

        var request = new DocumentCommentDto.UpdateRequest("수정된 코멘트");

        mockMvc.perform(put("/api/v1/documents/{documentId}/comments/{commentId}",
                        DOC_ID, commentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("수정된 코멘트"));
    }

    @Test
    void deleteComment_returnsOk() throws Exception {
        UUID commentId = UUID.randomUUID();
        doNothing().when(commentService).deleteComment(any(), any(), any());

        mockMvc.perform(delete("/api/v1/documents/{documentId}/comments/{commentId}",
                        DOC_ID, commentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteComment_forbidden_returns403() throws Exception {
        UUID commentId = UUID.randomUUID();
        doThrow(BusinessException.forbidden("코멘트 삭제 권한이 없습니다"))
                .when(commentService).deleteComment(any(), any(), any());

        mockMvc.perform(delete("/api/v1/documents/{documentId}/comments/{commentId}",
                        DOC_ID, commentId))
                .andExpect(status().isForbidden());
    }

    @Test
    void resolveComment_returnsOk() throws Exception {
        UUID commentId = UUID.randomUUID();
        var response = DocumentCommentDto.CommentResponse.builder()
                .id(commentId)
                .documentId(DOC_ID)
                .userId(UUID.randomUUID())
                .userName("테스트 유저")
                .content("코멘트")
                .resolved(true)
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.resolveComment(any(), any(), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/documents/{documentId}/comments/{commentId}/resolve",
                        DOC_ID, commentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resolved").value(true));
    }

    @Test
    void unresolveComment_returnsOk() throws Exception {
        UUID commentId = UUID.randomUUID();
        var response = DocumentCommentDto.CommentResponse.builder()
                .id(commentId)
                .documentId(DOC_ID)
                .userId(UUID.randomUUID())
                .userName("테스트 유저")
                .content("코멘트")
                .resolved(false)
                .isOwner(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(commentService.unresolveComment(any(), any(), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/documents/{documentId}/comments/{commentId}/unresolve",
                        DOC_ID, commentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resolved").value(false));
    }
}
