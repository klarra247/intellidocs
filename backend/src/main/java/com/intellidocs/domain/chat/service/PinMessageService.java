package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
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
public class PinMessageService {

    private static final int MAX_PINS_PER_SESSION = 10;

    private final SessionAccessService sessionAccessService;
    private final ChatMessageRepository chatMessageRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Transactional
    public PinMessageDto.PinResponse pinMessage(UUID messageId, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        // 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        // USER 메시지는 핀 불가
        if (!message.isAssistantMessage()) {
            throw BusinessException.cannotPinUserMessage();
        }

        // 멱등: 이미 핀된 상태면 현재 상태 반환
        if (Boolean.TRUE.equals(message.getIsPinned())) {
            return new PinMessageDto.PinResponse(
                    messageId, true, message.getPinnedBy(), message.getPinnedAt());
        }

        // 세션당 핀 제한 확인
        long pinnedCount = chatMessageRepository
                .countBySessionIdAndIsPinnedTrue(message.getSession().getId());
        if (pinnedCount >= MAX_PINS_PER_SESSION) {
            throw BusinessException.pinLimitExceeded(MAX_PINS_PER_SESSION);
        }

        message.pin(userId);
        chatMessageRepository.save(message);

        try {
            UUID sessionCreatorId = message.getSession().getUserId();
            User sender = userRepository.findById(userId).orElse(null);
            String senderName = sender != null ? sender.getName() : "알 수 없음";
            notificationService.createNotification(
                    sessionCreatorId,
                    userId,
                    message.getSession().getWorkspaceId(),
                    NotificationType.MESSAGE_PINNED,
                    senderName + "님이 메시지를 고정했습니다",
                    null,
                    "chat_message",
                    messageId
            );
        } catch (Exception e) {
            log.warn("[Notification] Failed to send MESSAGE_PINNED notification", e);
        }

        return new PinMessageDto.PinResponse(
                messageId, true, message.getPinnedBy(), message.getPinnedAt());
    }

    @Transactional
    public PinMessageDto.PinResponse unpinMessage(UUID messageId, UUID userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> BusinessException.notFound("ChatMessage", messageId));

        // 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(message.getSession().getId(), userId);

        message.unpin();
        chatMessageRepository.save(message);

        return new PinMessageDto.PinResponse(messageId, false, null, null);
    }

    @Transactional(readOnly = true)
    public List<PinMessageDto.PinnedMessageResponse> getPinnedMessages(UUID sessionId, UUID userId) {
        // 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(sessionId, userId);

        return chatMessageRepository
                .findBySessionIdAndIsPinnedTrueOrderByPinnedAtDesc(sessionId).stream()
                .map(m -> PinMessageDto.PinnedMessageResponse.builder()
                        .id(m.getId())
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .sourceChunks(m.getSourceChunks())
                        .confidence(m.getConfidence())
                        .isPinned(true)
                        .pinnedBy(m.getPinnedBy())
                        .pinnedAt(m.getPinnedAt())
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();
    }
}
