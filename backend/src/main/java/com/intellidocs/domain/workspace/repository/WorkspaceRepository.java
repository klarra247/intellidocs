package com.intellidocs.domain.workspace.repository;

import com.intellidocs.domain.workspace.entity.Workspace;
import com.intellidocs.domain.workspace.entity.WorkspaceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    Optional<Workspace> findByOwnerIdAndType(UUID ownerId, WorkspaceType type);

    long countByOwnerIdAndType(UUID ownerId, WorkspaceType type);
}
