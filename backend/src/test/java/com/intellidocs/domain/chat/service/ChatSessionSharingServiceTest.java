package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.ChatSessionDto;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.entity.SessionReadStatus;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import com.intellidocs.domain.chat.repository.SessionReadStatusRepository;
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
class ChatSessionSharingServiceTest {

    @Mock private SessionAccessService sessionAccessService;
    @Mock private ChatSessionRepository chatSessionRepository;
    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private SessionReadStatusRepository sessionReadStatusRepository;
    @Mock private UserRepository userRepository;

    private ChatSessionSharingService service;

    @BeforeEach
    void setUp() {
        service = new ChatSessionSharingService(
                sessionAccessService, chatSessionRepository, chatMessageRepository,
                sessionReadStatusRepository, userRepository);
    }

    @Test
    void shareSession_byCreator_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(userId).workspaceId(workspaceId).build();

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionAccessService.isPersonalWorkspace(workspaceId)).thenReturn(false);
        when(chatSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatSessionDto.ShareResponse result = service.shareSession(sessionId, userId);

        assertThat(result.isShared()).isTrue();
        assertThat(result.sharedAt()).isNotNull();
    }

    @Test
    void shareSession_notCreator_throwsForbidden() {
        UUID creatorId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(creatorId).build();

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.shareSession(sessionId, otherUserId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("생성자만");
    }

    @Test
    void shareSession_personalWorkspace_throwsBadRequest() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(userId).workspaceId(workspaceId).build();

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionAccessService.isPersonalWorkspace(workspaceId)).thenReturn(true);

        assertThatThrownBy(() -> service.shareSession(sessionId, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("개인 워크스페이스");
    }

    @Test
    void shareSession_alreadyShared_idempotent() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(userId).workspaceId(workspaceId).build();
        session.share(); // already shared

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionAccessService.isPersonalWorkspace(workspaceId)).thenReturn(false);

        ChatSessionDto.ShareResponse result = service.shareSession(sessionId, userId);

        assertThat(result.isShared()).isTrue();
        verify(chatSessionRepository, never()).save(any());
    }

    @Test
    void unshareSession_byCreator_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(userId).build();
        session.share();

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(chatSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatSessionDto.ShareResponse result = service.unshareSession(sessionId, userId);

        assertThat(result.isShared()).isFalse();
    }

    @Test
    void getSessionList_returnsAccessibleSessions() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID()).userId(userId).workspaceId(workspaceId)
                .title("테스트").creatorName("Dev User").build();

        when(chatSessionRepository.findAccessibleSessions(workspaceId, userId))
                .thenReturn(List.of(session));
        when(chatMessageRepository.countBySessionId(any())).thenReturn(5L);
        when(chatMessageRepository.findTopBySessionIdOrderByCreatedAtDesc(any()))
                .thenReturn(Optional.empty());
        when(sessionReadStatusRepository.findByUserIdAndSessionIdIn(any(), any()))
                .thenReturn(List.of());

        List<ChatSessionDto.SessionSummary> result = service.getSessionList(workspaceId, userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("테스트");
        assertThat(result.get(0).isOwner()).isTrue();
        assertThat(result.get(0).messageCount()).isEqualTo(5);
    }

    @Test
    void updateReadStatus_createsNewReadStatus() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();

        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(userId).build();

        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId)).thenReturn(session);
        when(sessionReadStatusRepository.findBySessionIdAndUserId(sessionId, userId))
                .thenReturn(Optional.empty());
        when(sessionReadStatusRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatSessionDto.ReadStatusResponse result =
                service.updateReadStatus(sessionId, messageId, userId);

        assertThat(result.sessionId()).isEqualTo(sessionId);
        assertThat(result.lastReadMessageId()).isEqualTo(messageId);
        verify(sessionReadStatusRepository).save(any());
    }
}
