package com.intellidocs.domain.chat.repository;

import com.intellidocs.domain.chat.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<ChatSession> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.workspaceId = :workspaceId " +
            "AND (cs.userId = :userId OR cs.isShared = true) ORDER BY cs.createdAt DESC")
    List<ChatSession> findAccessibleSessions(@Param("workspaceId") UUID workspaceId,
                                              @Param("userId") UUID userId);
}