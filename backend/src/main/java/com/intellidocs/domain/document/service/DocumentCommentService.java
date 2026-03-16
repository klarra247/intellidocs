package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.document.dto.DocumentCommentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentComment;
import com.intellidocs.domain.document.repository.DocumentCommentRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.service.NotificationService;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentCommentService {

    private static final int MAX_COMMENTS_PER_DOCUMENT = 100;

    private final DocumentCommentRepository commentRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final NotificationService notificationService;

    @Transactional
    public DocumentCommentDto.CommentResponse createComment(UUID documentId,
                                                             DocumentCommentDto.CreateRequest request,
                                                             UUID userId) {
        Document document = getDocumentWithAccessCheck(documentId, userId);

        if (commentRepository.countByDocumentId(documentId) >= MAX_COMMENTS_PER_DOCUMENT) {
            throw BusinessException.commentLimitExceeded(MAX_COMMENTS_PER_DOCUMENT);
        }

        DocumentComment comment = DocumentComment.builder()
                .documentId(documentId)
                .userId(userId)
                .content(request.content())
                .chunkIndex(request.chunkIndex())
                .pageNumber(request.pageNumber())
                .build();
        comment = commentRepository.saveAndFlush(comment);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));

        try {
            UUID uploaderId = document.getUserId();
            String senderName = user.getName();
            notificationService.createNotification(
                    uploaderId,
                    userId,
                    document.getWorkspaceId(),
                    NotificationType.DOC_COMMENT_ADDED,
                    senderName + "님이 " + document.getOriginalFilename() + "에 코멘트를 남겼습니다",
                    request.content().length() > 100 ? request.content().substring(0, 100) + "..." : request.content(),
                    "document",
                    documentId
            );
        } catch (Exception e) {
            log.warn("[Notification] Failed to send DOC_COMMENT_ADDED notification", e);
        }

        return toResponse(comment, user, userId);
    }

    @Transactional(readOnly = true)
    public DocumentCommentDto.CommentListResponse getComments(UUID documentId, Boolean resolved, UUID userId) {
        getDocumentWithAccessCheck(documentId, userId);

        List<DocumentComment> comments;
        if (resolved != null) {
            comments = commentRepository.findByDocumentIdAndResolvedOrderByCreatedAtAsc(documentId, resolved);
        } else {
            comments = commentRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
        }

        long totalCount = commentRepository.countByDocumentId(documentId);
        long unresolvedCount = comments.stream().filter(c -> !Boolean.TRUE.equals(c.getResolved())).count();
        if (resolved != null) {
            unresolvedCount = resolved
                    ? 0
                    : comments.size();
        }

        List<DocumentCommentDto.CommentResponse> responses = comments.stream()
                .map(comment -> {
                    User user = userRepository.findById(comment.getUserId()).orElse(null);
                    return toResponse(comment, user, userId);
                })
                .toList();

        return DocumentCommentDto.CommentListResponse.builder()
                .comments(responses)
                .totalCount(totalCount)
                .unresolvedCount(unresolvedCount)
                .build();
    }

    @Transactional
    public DocumentCommentDto.CommentResponse updateComment(UUID documentId, UUID commentId,
                                                             String content, UUID userId) {
        getDocumentWithAccessCheck(documentId, userId);

        DocumentComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("DocumentComment", commentId));

        if (!comment.isOwnedBy(userId)) {
            throw BusinessException.forbidden("본인의 코멘트만 수정할 수 있습니다");
        }

        comment.updateContent(content);
        commentRepository.save(comment);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));

        return toResponse(comment, user, userId);
    }

    @Transactional
    public void deleteComment(UUID documentId, UUID commentId, UUID userId) {
        Document document = getDocumentWithAccessCheck(documentId, userId);

        DocumentComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("DocumentComment", commentId));

        if (!comment.isOwnedBy(userId) && !isAdminOrOwner(document.getWorkspaceId(), userId)) {
            throw BusinessException.forbidden("코멘트 삭제 권한이 없습니다");
        }

        commentRepository.delete(comment);
    }

    @Transactional
    public DocumentCommentDto.CommentResponse resolveComment(UUID documentId, UUID commentId, UUID userId) {
        getDocumentWithAccessCheck(documentId, userId);

        DocumentComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("DocumentComment", commentId));

        comment.resolve(userId);
        commentRepository.save(comment);

        User user = userRepository.findById(userId).orElse(null);
        return toResponse(comment, user, userId);
    }

    @Transactional
    public DocumentCommentDto.CommentResponse unresolveComment(UUID documentId, UUID commentId, UUID userId) {
        getDocumentWithAccessCheck(documentId, userId);

        DocumentComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("DocumentComment", commentId));

        comment.unresolve();
        commentRepository.save(comment);

        User user = userRepository.findById(userId).orElse(null);
        return toResponse(comment, user, userId);
    }

    private Document getDocumentWithAccessCheck(UUID documentId, UUID userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getWorkspaceId() != null) {
            boolean isMember = workspaceMemberRepository
                    .existsByWorkspaceIdAndUserId(document.getWorkspaceId(), userId);
            if (!isMember) {
                throw BusinessException.forbidden("이 문서에 접근할 수 없습니다");
            }
        }

        return document;
    }

    private boolean isAdminOrOwner(UUID workspaceId, UUID userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(WorkspaceMember::isAdminOrOwner)
                .orElse(false);
    }

    private DocumentCommentDto.CommentResponse toResponse(DocumentComment comment, User user, UUID currentUserId) {
        String userName = user != null ? user.getName() : "탈퇴한 멤버";
        String profileImage = user != null ? user.getProfileImageUrl() : null;

        String resolvedByName = null;
        if (comment.getResolvedBy() != null) {
            resolvedByName = userRepository.findById(comment.getResolvedBy())
                    .map(User::getName)
                    .orElse("탈퇴한 멤버");
        }

        return DocumentCommentDto.CommentResponse.builder()
                .id(comment.getId())
                .documentId(comment.getDocumentId())
                .userId(comment.getUserId())
                .userName(userName)
                .userProfileImage(profileImage)
                .chunkIndex(comment.getChunkIndex())
                .pageNumber(comment.getPageNumber())
                .content(comment.getContent())
                .resolved(Boolean.TRUE.equals(comment.getResolved()))
                .resolvedBy(comment.getResolvedBy())
                .resolvedByName(resolvedByName)
                .resolvedAt(comment.getResolvedAt())
                .isOwner(comment.isOwnedBy(currentUserId))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
