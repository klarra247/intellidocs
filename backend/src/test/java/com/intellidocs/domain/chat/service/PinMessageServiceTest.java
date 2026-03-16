package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PinMessageServiceTest {

    @Mock private SessionAccessService sessionAccessService;
    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private NotificationService notificationService;
    @Mock private UserRepository userRepository;

    private PinMessageService service;

    @BeforeEach
    void setUp() {
        service = new PinMessageService(sessionAccessService, chatMessageRepository, notificationService, userRepository);
    }

    private ChatMessage buildAssistantMessage(UUID sessionId) {
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).build();
        return ChatMessage.builder()
                .id(UUID.randomUUID()).session(session)
                .role(ChatMessage.Role.ASSISTANT).content("답변입니다")
                .build();
    }

    private ChatMessage buildUserMessage(UUID sessionId) {
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).build();
        return ChatMessage.builder()
                .id(UUID.randomUUID()).session(session)
                .role(ChatMessage.Role.USER).content("질문입니다")
                .build();
    }

    @Test
    void pinMessage_assistantMessage_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildAssistantMessage(sessionId);

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(chatMessageRepository.countBySessionIdAndIsPinnedTrue(sessionId)).thenReturn(0L);
        when(chatMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PinMessageDto.PinResponse result = service.pinMessage(message.getId(), userId);

        assertThat(result.isPinned()).isTrue();
        assertThat(result.pinnedBy()).isEqualTo(userId);
    }

    @Test
    void pinMessage_userMessage_throwsBadRequest() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildUserMessage(sessionId);

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());

        assertThatThrownBy(() -> service.pinMessage(message.getId(), userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("사용자 메시지");
    }

    @Test
    void pinMessage_limitExceeded_throwsBadRequest() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildAssistantMessage(sessionId);

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(chatMessageRepository.countBySessionIdAndIsPinnedTrue(sessionId)).thenReturn(10L);

        assertThatThrownBy(() -> service.pinMessage(message.getId(), userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("최대");
    }

    @Test
    void pinMessage_alreadyPinned_idempotent() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildAssistantMessage(sessionId);
        message.pin(userId);

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());

        PinMessageDto.PinResponse result = service.pinMessage(message.getId(), userId);

        assertThat(result.isPinned()).isTrue();
        verify(chatMessageRepository, never()).save(any());
    }

    @Test
    void unpinMessage_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatMessage message = buildAssistantMessage(sessionId);
        message.pin(userId);

        when(chatMessageRepository.findById(message.getId())).thenReturn(Optional.of(message));
        when(sessionAccessService.getSessionWithAccessCheck(sessionId, userId))
                .thenReturn(message.getSession());
        when(chatMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PinMessageDto.PinResponse result = service.unpinMessage(message.getId(), userId);

        assertThat(result.isPinned()).isFalse();
    }
}
