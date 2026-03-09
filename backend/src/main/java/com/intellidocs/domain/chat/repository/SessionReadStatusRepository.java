package com.intellidocs.domain.chat.repository;

import com.intellidocs.domain.chat.entity.SessionReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionReadStatusRepository extends JpaRepository<SessionReadStatus, UUID> {

    Optional<SessionReadStatus> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    List<SessionReadStatus> findByUserIdAndSessionIdIn(UUID userId, List<UUID> sessionIds);
}
