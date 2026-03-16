package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.CommentDto;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.entity.Comment;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.CommentRepository;
import com.intellidocs.domain.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock private SessionAccessService sessionAccessService;
    @Mock private CommentRepository commentRepository;
    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    private CommentService service;

    @BeforeEach
    void setUp() {
        service = new CommentService(
                sessionAccessService, commentRepository, chatMessageRepository, userRepository, notificationService);
    }

    private ChatMessage buildMessage(UUID sessionId) {
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).build();
        return ChatMessage.builder()
                .id(UUID.randomUUID()).session(session)
                .role(ChatMessage.Role.ASSISTANT).content("답변")
                .build();
    }

    @Test
    void createComment_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildMessage(sessionId);

        User user = User.builder().id(userId).name("테스트 유저").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(commentRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CommentDto.CommentResponse result =
                service.createComment(message.getId(), "좋은 답변입니다", userId);

        assertThat(result.content()).isEqualTo("좋은 답변입니다");
        assertThat(result.userName()).isEqualTo("테스트 유저");
        assertThat(result.isOwner()).isTrue();
    }

    @Test
    void getComments_withDeletedUser_showsPlaceholder() {
        UUID userId = UUID.randomUUID();
        UUID deletedUserId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildMessage(sessionId);

        Comment comment = Comment.builder()
                .id(UUID.randomUUID()).messageId(message.getId())
                .userId(deletedUserId).content("코멘트").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(commentRepository.findByMessageIdOrderByCreatedAtAsc(message.getId()))
                .thenReturn(List.of(comment));
        when(userRepository.findById(deletedUserId)).thenReturn(Optional.empty());

        List<CommentDto.CommentResponse> results =
                service.getComments(message.getId(), userId);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).userName()).isEqualTo("탈퇴한 멤버");
    }

    @Test
    void updateComment_byOwner_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildMessage(sessionId);
        UUID commentId = UUID.randomUUID();

        Comment comment = Comment.builder()
                .id(commentId).messageId(message.getId())
                .userId(userId).content("원래 코멘트").build();

        User user = User.builder().id(userId).name("테스트 유저").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CommentDto.CommentResponse result =
                service.updateComment(message.getId(), commentId, "수정된 코멘트", userId);

        assertThat(result.content()).isEqualTo("수정된 코멘트");
    }

    @Test
    void updateComment_byNonOwner_throwsForbidden() {
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildMessage(sessionId);
        UUID commentId = UUID.randomUUID();

        Comment comment = Comment.builder()
                .id(commentId).messageId(message.getId())
                .userId(ownerId).content("원래 코멘트").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, otherUserId))
                .thenReturn(message.getSession());
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() ->
                service.updateComment(message.getId(), commentId, "수정", otherUserId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("본인");
    }

    @Test
    void deleteComment_byOwner_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildMessage(sessionId);
        UUID commentId = UUID.randomUUID();

        Comment comment = Comment.builder()
                .id(commentId).messageId(message.getId())
                .userId(userId).content("삭제할 코멘트").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        service.deleteComment(message.getId(), commentId, userId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void deleteComment_byAdmin_succeeds() {
        UUID ownerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).workspaceId(workspaceId).build();
        ChatMessage message = ChatMessage.builder()
                .id(UUID.randomUUID()).session(session)
                .role(ChatMessage.Role.ASSISTANT).content("답변").build();
        UUID commentId = UUID.randomUUID();

        Comment comment = Comment.builder()
                .id(commentId).messageId(message.getId())
                .userId(ownerId).content("다른 사람의 코멘트").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, adminId)).thenReturn(session);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(sessionAccessService.isAdminOrOwner(workspaceId, adminId)).thenReturn(true);

        service.deleteComment(message.getId(), commentId, adminId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void deleteComment_byNonOwnerNonAdmin_throwsForbidden() {
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).workspaceId(workspaceId).build();
        ChatMessage message = ChatMessage.builder()
                .id(UUID.randomUUID()).session(session)
                .role(ChatMessage.Role.ASSISTANT).content("답변").build();
        UUID commentId = UUID.randomUUID();

        Comment comment = Comment.builder()
                .id(commentId).messageId(message.getId())
                .userId(ownerId).content("다른 사람의 코멘트").build();

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, otherUserId)).thenReturn(session);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(sessionAccessService.isAdminOrOwner(workspaceId, otherUserId)).thenReturn(false);

        assertThatThrownBy(() ->
                service.deleteComment(message.getId(), commentId, otherUserId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("권한");
    }
}
