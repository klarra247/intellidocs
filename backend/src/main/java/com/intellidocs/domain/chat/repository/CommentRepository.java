package com.intellidocs.domain.chat.repository;

import com.intellidocs.domain.chat.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByMessageIdOrderByCreatedAtAsc(UUID messageId);

    long countByMessageId(UUID messageId);
}
