package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.ChatSessionDto;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.entity.SessionReadStatus;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import com.intellidocs.domain.chat.repository.SessionReadStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatSessionSharingService {

    private final SessionAccessService sessionAccessService;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final SessionReadStatusRepository sessionReadStatusRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatSessionDto.ShareResponse shareSession(UUID sessionId, UUID userId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> BusinessException.notFound("ChatSession", sessionId));

        if (!session.isCreator(userId)) {
            throw BusinessException.forbidden("세션 생성자만 공유할 수 있습니다");
        }

        if (sessionAccessService.isPersonalWorkspace(session.getWorkspaceId())) {
            throw BusinessException.personalWorkspaceRestriction("세션 공유");
        }

        // 멱등: 이미 공유 상태면 현재 상태 반환
        if (!Boolean.TRUE.equals(session.getIsShared())) {
            session.share();
            chatSessionRepository.save(session);
        }

        return new ChatSessionDto.ShareResponse(session.getIsShared(), session.getSharedAt());
    }

    @Transactional
    public ChatSessionDto.ShareResponse unshareSession(UUID sessionId, UUID userId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> BusinessException.notFound("ChatSession", sessionId));

        if (!session.isCreator(userId)) {
            throw BusinessException.forbidden("세션 생성자만 공유를 해제할 수 있습니다");
        }

        session.unshare();
        chatSessionRepository.save(session);

        return new ChatSessionDto.ShareResponse(false, null);
    }

    @Transactional(readOnly = true)
    public List<ChatSessionDto.SessionSummary> getSessionList(UUID workspaceId, UUID userId) {
        List<ChatSession> sessions = chatSessionRepository
                .findAccessibleSessions(workspaceId, userId);

        if (sessions.isEmpty()) {
            return List.of();
        }

        List<UUID> sessionIds = sessions.stream().map(ChatSession::getId).toList();

        // Batch read status
        Map<UUID, SessionReadStatus> readStatusMap = sessionReadStatusRepository
                .findByUserIdAndSessionIdIn(userId, sessionIds).stream()
                .collect(Collectors.toMap(SessionReadStatus::getSessionId, Function.identity()));

        // Batch session stats: messageCount + lastMessageAt (1 query)
        Map<UUID, Object[]> statsMap = chatMessageRepository.findSessionStats(sessionIds).stream()
                .collect(Collectors.toMap(r -> (UUID) r[0], Function.identity()));

        // Batch unread counts (1 query)
        Map<UUID, Long> unreadMap = chatMessageRepository.countUnreadBatch(sessionIds, userId).stream()
                .collect(Collectors.toMap(r -> (UUID) r[0], r -> ((Number) r[1]).longValue()));

        return sessions.stream().map(session -> {
            Object[] stats = statsMap.get(session.getId());
            long messageCount = stats != null ? ((Number) stats[1]).longValue() : 0;
            LocalDateTime lastMessageAt = stats != null ? (LocalDateTime) stats[2] : null;

            long unreadCount = unreadMap.getOrDefault(session.getId(), 0L);
            // readStatus 없는 공유 세션 → 전체 메시지가 unread
            if (!unreadMap.containsKey(session.getId())
                    && !readStatusMap.containsKey(session.getId())
                    && messageCount > 0 && !session.isCreator(userId)) {
                unreadCount = messageCount;
            }

            return ChatSessionDto.SessionSummary.builder()
                    .id(session.getId())
                    .title(session.getTitle())
                    .creatorId(session.getUserId())
                    .creatorName(session.getCreatorName())
                    .isShared(Boolean.TRUE.equals(session.getIsShared()))
                    .isOwner(session.isCreator(userId))
                    .messageCount(messageCount)
                    .lastMessageAt(lastMessageAt)
                    .unreadCount(unreadCount)
                    .createdAt(session.getCreatedAt())
                    .build();
        }).toList();
    }

    @Transactional
    public ChatSessionDto.ReadStatusResponse updateReadStatus(UUID sessionId, UUID lastReadMessageId, UUID userId) {
        // 접근 권한 확인
        sessionAccessService.getSessionWithAccessCheck(sessionId, userId);

        SessionReadStatus readStatus = sessionReadStatusRepository
                .findBySessionIdAndUserId(sessionId, userId)
                .orElseGet(() -> SessionReadStatus.builder()
                        .sessionId(sessionId)
                        .userId(userId)
                        .build());

        readStatus.markRead(lastReadMessageId);
        sessionReadStatusRepository.save(readStatus);

        return new ChatSessionDto.ReadStatusResponse(sessionId, lastReadMessageId, readStatus.getLastReadAt());
    }
}
