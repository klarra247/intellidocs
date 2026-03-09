package com.intellidocs.domain.workspace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspace_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class WorkspaceMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID workspaceId;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private WorkspaceMemberRole role = WorkspaceMemberRole.MEMBER;

    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    // === Domain Methods ===

    public void changeRole(WorkspaceMemberRole newRole) {
        this.role = newRole;
    }

    public boolean isOwner() {
        return this.role == WorkspaceMemberRole.OWNER;
    }

    public boolean isAdminOrOwner() {
        return this.role == WorkspaceMemberRole.OWNER || this.role == WorkspaceMemberRole.ADMIN;
    }
}
