package com.intellidocs.domain.chat.repository;

import com.intellidocs.domain.chat.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByMessageIdOrderByCreatedAtAsc(UUID messageId);

    long countByMessageId(UUID messageId);

    @Query("SELECT c.messageId, COUNT(c) FROM Comment c WHERE c.messageId IN :messageIds GROUP BY c.messageId")
    List<Object[]> countByMessageIds(@Param("messageIds") List<UUID> messageIds);
}
