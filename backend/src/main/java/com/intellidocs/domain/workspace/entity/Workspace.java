package com.intellidocs.domain.workspace.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private WorkspaceType type = WorkspaceType.PERSONAL;

    @Builder.Default
    private Integer maxMembers = 1;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // === Domain Methods ===

    public void updateInfo(String name, String description) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
    }

    public boolean isPersonal() {
        return this.type == WorkspaceType.PERSONAL;
    }

    public boolean isTeam() {
        return this.type == WorkspaceType.TEAM;
    }
}
