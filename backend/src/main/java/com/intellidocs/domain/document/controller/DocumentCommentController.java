package com.intellidocs.domain.document.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.document.dto.DocumentCommentDto;
import com.intellidocs.domain.document.service.DocumentCommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents/{documentId}/comments")
@RequiredArgsConstructor
public class DocumentCommentController {

    private final DocumentCommentService commentService;

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentCommentDto.CommentResponse>> createComment(
            @PathVariable UUID documentId,
            @Valid @RequestBody DocumentCommentDto.CreateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(commentService.createComment(documentId, request, userId)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DocumentCommentDto.CommentListResponse>> getComments(
            @PathVariable UUID documentId,
            @RequestParam(required = false) Boolean resolved) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(commentService.getComments(documentId, resolved, userId)));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<DocumentCommentDto.CommentResponse>> updateComment(
            @PathVariable UUID documentId,
            @PathVariable UUID commentId,
            @Valid @RequestBody DocumentCommentDto.UpdateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.ok(commentService.updateComment(documentId, commentId, request.content(), userId)));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable UUID documentId,
            @PathVariable UUID commentId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        commentService.deleteComment(documentId, commentId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PatchMapping("/{commentId}/resolve")
    public ResponseEntity<ApiResponse<DocumentCommentDto.CommentResponse>> resolveComment(
            @PathVariable UUID documentId,
            @PathVariable UUID commentId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(commentService.resolveComment(documentId, commentId, userId)));
    }

    @PatchMapping("/{commentId}/unresolve")
    public ResponseEntity<ApiResponse<DocumentCommentDto.CommentResponse>> unresolveComment(
            @PathVariable UUID documentId,
            @PathVariable UUID commentId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(commentService.unresolveComment(documentId, commentId, userId)));
    }
}
