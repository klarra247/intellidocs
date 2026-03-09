package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.chat.dto.PinMessageDto;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
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
