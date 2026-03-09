package com.intellidocs.domain.workspace.dto;

import com.intellidocs.domain.workspace.entity.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class WorkspaceDto {

    public record CreateRequest(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 500) String description
    ) {}

    public record UpdateRequest(
            @Size(max = 100) String name,
            @Size(max = 500) String description
    ) {}

    @Builder
    public record WorkspaceResponse(
            UUID id,
            String name,
            String description,
            WorkspaceType type,
            WorkspaceMemberRole role,
            long memberCount,
            LocalDateTime createdAt
    ) {}

    @Builder
    public record WorkspaceDetailResponse(
            UUID id,
            String name,
            String description,
            WorkspaceType type,
            WorkspaceMemberRole myRole,
            Integer maxMembers,
            List<MemberResponse> members,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    @Builder
    public record MemberResponse(
            UUID userId,
            String name,
            String email,
            String profileImageUrl,
            WorkspaceMemberRole role,
            LocalDateTime joinedAt
    ) {}

    public record InviteRequest(
            @NotBlank String email,
            WorkspaceMemberRole role
    ) {}

    @Builder
    public record InviteResponse(
            UUID invitationId,
            String token,
            String email,
            InvitationStatus status,
            LocalDateTime expiresAt
    ) {}

    @Builder
    public record PendingInvitationResponse(
            UUID id,
            String token,
            String workspaceName,
            String inviterName,
            String inviterEmail,
            WorkspaceMemberRole role,
            LocalDateTime expiresAt
    ) {}

    public record RoleChangeRequest(
            WorkspaceMemberRole role
    ) {}
}
