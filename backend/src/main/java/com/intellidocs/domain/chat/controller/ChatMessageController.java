package com.intellidocs.domain.chat.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.chat.dto.CommentDto;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.service.CommentService;
import com.intellidocs.domain.chat.service.PinMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final PinMessageService pinMessageService;
    private final CommentService commentService;

    @PatchMapping("/{messageId}/pin")
    public ApiResponse<PinMessageDto.PinResponse> pinMessage(@PathVariable UUID messageId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(pinMessageService.pinMessage(messageId, userId));
    }

    @PatchMapping("/{messageId}/unpin")
    public ApiResponse<PinMessageDto.PinResponse> unpinMessage(@PathVariable UUID messageId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(pinMessageService.unpinMessage(messageId, userId));
    }

    @PostMapping("/{messageId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentDto.CommentResponse> createComment(
            @PathVariable UUID messageId,
            @RequestBody @Valid CommentDto.CreateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(commentService.createComment(messageId, request.content(), userId));
    }

    @GetMapping("/{messageId}/comments")
    public ApiResponse<List<CommentDto.CommentResponse>> getComments(@PathVariable UUID messageId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(commentService.getComments(messageId, userId));
    }

    @PutMapping("/{messageId}/comments/{commentId}")
    public ApiResponse<CommentDto.CommentResponse> updateComment(
            @PathVariable UUID messageId,
            @PathVariable UUID commentId,
            @RequestBody @Valid CommentDto.UpdateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(commentService.updateComment(messageId, commentId, request.content(), userId));
    }

    @DeleteMapping("/{messageId}/comments/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable UUID messageId,
            @PathVariable UUID commentId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        commentService.deleteComment(messageId, commentId, userId);
        return ApiResponse.ok();
    }
}
