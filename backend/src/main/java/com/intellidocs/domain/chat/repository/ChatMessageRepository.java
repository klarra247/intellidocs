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

    @Query("SELECT cm.session.id, COUNT(cm), MAX(cm.createdAt) " +
            "FROM ChatMessage cm WHERE cm.session.id IN :sessionIds GROUP BY cm.session.id")
    List<Object[]> findSessionStats(@Param("sessionIds") List<UUID> sessionIds);

    @Query(value = "SELECT cm.session_id, COUNT(*) FROM chat_messages cm " +
            "JOIN session_read_status srs ON srs.session_id = cm.session_id AND srs.user_id = :userId " +
            "WHERE cm.session_id IN :sessionIds " +
            "AND cm.created_at > (SELECT m.created_at FROM chat_messages m WHERE m.id = srs.last_read_message_id) " +
            "GROUP BY cm.session_id", nativeQuery = true)
    List<Object[]> countUnreadBatch(@Param("sessionIds") List<UUID> sessionIds,
                                    @Param("userId") UUID userId);
}