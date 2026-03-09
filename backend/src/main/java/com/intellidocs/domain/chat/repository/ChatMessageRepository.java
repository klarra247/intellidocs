package com.intellidocs.domain.chat.repository;

import com.intellidocs.domain.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<ChatMessage> findBySessionIdAndIsPinnedTrueOrderByPinnedAtDesc(UUID sessionId);

    long countBySessionIdAndIsPinnedTrue(UUID sessionId);

    long countBySessionId(UUID sessionId);

    Optional<ChatMessage> findTopBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.session.id = :sessionId " +
            "AND cm.createdAt > (SELECT m.createdAt FROM ChatMessage m WHERE m.id = :lastReadMessageId)")
    long countUnreadMessages(@Param("sessionId") UUID sessionId,
                             @Param("lastReadMessageId") UUID lastReadMessageId);
}