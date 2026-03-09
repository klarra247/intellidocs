package com.intellidocs.common;

import com.intellidocs.domain.workspace.entity.WorkspaceMemberRole;

import java.util.UUID;

public final class WorkspaceContext {

    private static final ThreadLocal<UUID> WORKSPACE_ID = new ThreadLocal<>();
    private static final ThreadLocal<WorkspaceMemberRole> ROLE = new ThreadLocal<>();

    private WorkspaceContext() {}

    public static void set(UUID workspaceId, WorkspaceMemberRole role) {
        WORKSPACE_ID.set(workspaceId);
        ROLE.set(role);
    }

    public static UUID getCurrentWorkspaceId() {
        return WORKSPACE_ID.get();
    }

    public static WorkspaceMemberRole getCurrentRole() {
        return ROLE.get();
    }

    public static void clear() {
        WORKSPACE_ID.remove();
        ROLE.remove();
    }
}
