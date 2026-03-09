package com.intellidocs.domain.workspace.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.workspace.dto.WorkspaceDto;
import com.intellidocs.domain.workspace.entity.*;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    private static final int MAX_TEAM_WORKSPACES = 5;
    private static final int TEAM_MAX_MEMBERS = 10;

    @Transactional
    public Workspace createPersonalWorkspace(User user) {
        // Check if personal workspace already exists
        if (workspaceRepository.findByOwnerIdAndType(user.getId(), WorkspaceType.PERSONAL).isPresent()) {
            log.warn("Personal workspace already exists for user: {}", user.getId());
            return workspaceRepository.findByOwnerIdAndType(user.getId(), WorkspaceType.PERSONAL).get();
        }

        Workspace workspace = Workspace.builder()
                .name(user.getName() + "의 워크스페이스")
                .ownerId(user.getId())
                .type(WorkspaceType.PERSONAL)
                .maxMembers(1)
                .build();
        workspaceRepository.save(workspace);

        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId(workspace.getId())
                .userId(user.getId())
                .role(WorkspaceMemberRole.OWNER)
                .build();
        workspaceMemberRepository.save(ownerMember);

        log.info("Created personal workspace for user: {} (workspaceId={})", user.getEmail(), workspace.getId());
        return workspace;
    }

    @Transactional
    public WorkspaceDto.WorkspaceResponse createTeamWorkspace(WorkspaceDto.CreateRequest request, UUID userId) {
        // Limit team workspaces per user
        long teamCount = workspaceRepository.countByOwnerIdAndType(userId, WorkspaceType.TEAM);
        if (teamCount >= MAX_TEAM_WORKSPACES) {
            throw BusinessException.badRequest("팀 워크스페이스는 최대 " + MAX_TEAM_WORKSPACES + "개까지 생성할 수 있습니다");
        }

        Workspace workspace = Workspace.builder()
                .name(request.name())
                .description(request.description())
                .ownerId(userId)
                .type(WorkspaceType.TEAM)
                .maxMembers(TEAM_MAX_MEMBERS)
                .build();
        workspaceRepository.save(workspace);

        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId(workspace.getId())
                .userId(userId)
                .role(WorkspaceMemberRole.OWNER)
                .build();
        workspaceMemberRepository.save(ownerMember);

        log.info("Created team workspace: name={}, owner={}", request.name(), userId);

        return WorkspaceDto.WorkspaceResponse.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .type(workspace.getType())
                .role(WorkspaceMemberRole.OWNER)
                .memberCount(1)
                .createdAt(workspace.getCreatedAt())
                .build();
    }

    public List<WorkspaceDto.WorkspaceResponse> getUserWorkspaces(UUID userId) {
        List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserId(userId);

        return memberships.stream().map(member -> {
            Workspace workspace = workspaceRepository.findById(member.getWorkspaceId())
                    .orElse(null);
            if (workspace == null) return null;

            long memberCount = workspaceMemberRepository.countByWorkspaceId(workspace.getId());

            return WorkspaceDto.WorkspaceResponse.builder()
                    .id(workspace.getId())
                    .name(workspace.getName())
                    .description(workspace.getDescription())
                    .type(workspace.getType())
                    .role(member.getRole())
                    .memberCount(memberCount)
                    .createdAt(workspace.getCreatedAt())
                    .build();
        }).filter(java.util.Objects::nonNull).toList();
    }

    public WorkspaceDto.WorkspaceDetailResponse getWorkspaceDetail(UUID workspaceId, UUID userId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> BusinessException.notFound("Workspace", workspaceId));

        WorkspaceMember myMembership = workspaceMemberRepository
                .findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);
        List<WorkspaceDto.MemberResponse> memberResponses = members.stream().map(m -> {
            User user = userRepository.findById(m.getUserId()).orElse(null);
            return WorkspaceDto.MemberResponse.builder()
                    .userId(m.getUserId())
                    .name(user != null ? user.getName() : null)
                    .email(user != null ? user.getEmail() : null)
                    .profileImageUrl(user != null ? user.getProfileImageUrl() : null)
                    .role(m.getRole())
                    .joinedAt(m.getJoinedAt())
                    .build();
        }).toList();

        return WorkspaceDto.WorkspaceDetailResponse.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .type(workspace.getType())
                .myRole(myMembership.getRole())
                .maxMembers(workspace.getMaxMembers())
                .members(memberResponses)
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .build();
    }

    @Transactional
    public WorkspaceDto.WorkspaceResponse updateWorkspace(UUID workspaceId,
                                                          WorkspaceDto.UpdateRequest request,
                                                          UUID userId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> BusinessException.notFound("Workspace", workspaceId));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        if (!member.isAdminOrOwner()) {
            throw BusinessException.forbidden("워크스페이스 수정 권한이 없습니다");
        }

        workspace.updateInfo(request.name(), request.description());

        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);

        return WorkspaceDto.WorkspaceResponse.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .type(workspace.getType())
                .role(member.getRole())
                .memberCount(memberCount)
                .createdAt(workspace.getCreatedAt())
                .build();
    }

    @Transactional
    public void deleteWorkspace(UUID workspaceId, UUID userId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> BusinessException.notFound("Workspace", workspaceId));

        if (workspace.isPersonal()) {
            throw BusinessException.badRequest("개인 워크스페이스는 삭제할 수 없습니다");
        }

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        if (!member.isOwner()) {
            throw BusinessException.forbidden("워크스페이스 삭제는 소유자만 가능합니다");
        }

        workspaceRepository.delete(workspace);
        log.info("Deleted workspace: id={}, name={}", workspaceId, workspace.getName());
    }

    @Transactional
    public void removeMember(UUID workspaceId, UUID targetUserId, UUID requesterId) {
        WorkspaceMember requester = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requesterId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        if (!requester.isAdminOrOwner()) {
            throw BusinessException.forbidden("멤버 제거 권한이 없습니다");
        }

        WorkspaceMember target = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> BusinessException.notFound("Member", targetUserId));

        if (target.isOwner()) {
            throw BusinessException.badRequest("소유자는 제거할 수 없습니다");
        }

        workspaceMemberRepository.delete(target);
        log.info("Removed member {} from workspace {}", targetUserId, workspaceId);
    }

    @Transactional
    public void leaveWorkspace(UUID workspaceId, UUID userId) {
        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        if (member.isOwner()) {
            throw BusinessException.badRequest("소유자는 워크스페이스를 떠날 수 없습니다. 먼저 소유권을 이전하세요.");
        }

        workspaceMemberRepository.delete(member);
        log.info("User {} left workspace {}", userId, workspaceId);
    }

    @Transactional
    public void changeMemberRole(UUID workspaceId, UUID targetUserId,
                                 WorkspaceMemberRole newRole, UUID requesterId) {
        WorkspaceMember requester = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requesterId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));

        if (!requester.isAdminOrOwner()) {
            throw BusinessException.forbidden("역할 변경 권한이 없습니다");
        }

        WorkspaceMember target = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> BusinessException.notFound("Member", targetUserId));

        if (target.isOwner()) {
            throw BusinessException.badRequest("소유자의 역할은 변경할 수 없습니다");
        }

        if (newRole == WorkspaceMemberRole.OWNER) {
            throw BusinessException.badRequest("소유자 역할은 직접 부여할 수 없습니다");
        }

        target.changeRole(newRole);
        log.info("Changed role of user {} in workspace {} to {}", targetUserId, workspaceId, newRole);
    }
}
