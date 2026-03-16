package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.CommentDto;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.Comment;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.CommentRepository;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final SessionAccessService sessionAccessService;
    private final CommentRepository commentRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public CommentDto.CommentResponse createComment(UUID messageId, String content, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        // 세션 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        Comment comment = Comment.builder()
                .messageId(messageId)
                .userId(userId)
                .content(content)
                .build();
        comment = commentRepository.saveAndFlush(comment);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));

        try {
            UUID sessionCreatorId = message.getSession().getUserId();
            String senderName = user.getName();
            String preview = content.length() > 100 ? content.substring(0, 100) + "..." : content;
            notificationService.createNotification(
                    sessionCreatorId,
                    userId,
                    message.getSession().getWorkspaceId(),
                    NotificationType.COMMENT_ADDED,
                    senderName + "님이 코멘트를 남겼습니다",
                    preview,
                    "chat_message",
                    messageId
            );
        } catch (Exception e) {
            log.warn("[Notification] Failed to send COMMENT_ADDED notification", e);
        }

        return toResponse(comment, user, userId);
    }

    @Transactional(readOnly = true)
    public List<CommentDto.CommentResponse> getComments(UUID messageId, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        // 세션 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        return commentRepository.findByMessageIdOrderByCreatedAtAsc(messageId).stream()
                .map(comment -> {
                    User user = userRepository.findById(comment.getUserId()).orElse(null);
                    return toResponse(comment, user, userId);
                })
                .toList();
    }

    @Transactional
    public CommentDto.CommentResponse updateComment(UUID messageId, UUID commentId,
                                                      String content, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("Comment", commentId));

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
    public void deleteComment(UUID messageId, UUID commentId, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        var session = sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> BusinessException.notFound("Comment", commentId));

        // 본인 또는 ADMIN/OWNER만 삭제 가능
        if (!comment.isOwnedBy(userId)
                && !sessionAccessService.isAdminOrOwner(session.getWorkspaceId(), userId)) {
            throw BusinessException.forbidden("코멘트 삭제 권한이 없습니다");
        }

        commentRepository.delete(comment);
    }

    private CommentDto.CommentResponse toResponse(Comment comment, User user, UUID currentUserId) {
        String userName = user != null ? user.getName() : "탈퇴한 멤버";
        String profileImage = user != null ? user.getProfileImageUrl() : null;

        return CommentDto.CommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userName(userName)
                .userProfileImage(profileImage)
                .content(comment.getContent())
                .isOwner(comment.isOwnedBy(currentUserId))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
