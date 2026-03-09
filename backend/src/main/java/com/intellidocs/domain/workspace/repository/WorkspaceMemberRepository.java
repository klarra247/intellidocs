package com.intellidocs.domain.workspace.repository;

import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    List<WorkspaceMember> findByUserId(UUID userId);

    List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);

    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    long countByWorkspaceId(UUID workspaceId);

    void deleteByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    @Query("SELECT wm.workspaceId FROM WorkspaceMember wm WHERE wm.userId = :userId")
    List<UUID> findWorkspaceIdsByUserId(UUID userId);
}
