package com.intellidocs.domain.workspace.repository;

import com.intellidocs.domain.workspace.entity.InvitationStatus;
import com.intellidocs.domain.workspace.entity.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, UUID> {

    Optional<WorkspaceInvitation> findByToken(String token);

    List<WorkspaceInvitation> findByEmailAndStatus(String email, InvitationStatus status);

    boolean existsByWorkspaceIdAndEmailAndStatus(UUID workspaceId, String email, InvitationStatus status);

    List<WorkspaceInvitation> findByWorkspaceIdAndStatus(UUID workspaceId, InvitationStatus status);
}
