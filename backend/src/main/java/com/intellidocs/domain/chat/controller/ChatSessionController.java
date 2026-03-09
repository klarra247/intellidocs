package com.intellidocs.domain.chat.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.chat.dto.ChatSessionDto;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.service.ChatSessionSharingService;
import com.intellidocs.domain.chat.service.PinMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/sessions")
@RequiredArgsConstructor
public class ChatSessionController {

    private final ChatSessionSharingService chatSessionSharingService;
    private final PinMessageService pinMessageService;

    @GetMapping
    public ApiResponse<List<ChatSessionDto.SessionSummary>> getSessionList() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ApiResponse.ok(chatSessionSharingService.getSessionList(workspaceId, userId));
    }

    @PostMapping("/{sessionId}/share")
    public ApiResponse<ChatSessionDto.ShareResponse> shareSession(@PathVariable UUID sessionId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(chatSessionSharingService.shareSession(sessionId, userId));
    }

    @PostMapping("/{sessionId}/unshare")
    public ApiResponse<ChatSessionDto.ShareResponse> unshareSession(@PathVariable UUID sessionId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(chatSessionSharingService.unshareSession(sessionId, userId));
    }

    @PatchMapping("/{sessionId}/read")
    public ApiResponse<ChatSessionDto.ReadStatusResponse> updateReadStatus(
            @PathVariable UUID sessionId,
            @RequestBody @Valid ChatSessionDto.ReadStatusRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(chatSessionSharingService
                .updateReadStatus(sessionId, request.lastReadMessageId(), userId));
    }

    @GetMapping("/{sessionId}/pinned")
    public ApiResponse<List<PinMessageDto.PinnedMessageResponse>> getPinnedMessages(
            @PathVariable UUID sessionId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(pinMessageService.getPinnedMessages(sessionId, userId));
    }
}
