package com.intellidocs.domain.workspace.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.workspace.dto.WorkspaceDto;
import com.intellidocs.domain.workspace.service.InvitationService;
import com.intellidocs.domain.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final InvitationService invitationService;

    @GetMapping
    public ApiResponse<List<WorkspaceDto.WorkspaceResponse>> getWorkspaces() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(workspaceService.getUserWorkspaces(userId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceDto.WorkspaceResponse> createWorkspace(
            @Valid @RequestBody WorkspaceDto.CreateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(workspaceService.createTeamWorkspace(request, userId));
    }

    @GetMapping("/{id}")
    public ApiResponse<WorkspaceDto.WorkspaceDetailResponse> getWorkspace(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(workspaceService.getWorkspaceDetail(id, userId));
    }

    @PutMapping("/{id}")
    public ApiResponse<WorkspaceDto.WorkspaceResponse> updateWorkspace(
            @PathVariable UUID id,
            @Valid @RequestBody WorkspaceDto.UpdateRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(workspaceService.updateWorkspace(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteWorkspace(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        workspaceService.deleteWorkspace(id, userId);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceDto.InviteResponse> invite(
            @PathVariable UUID id,
            @Valid @RequestBody WorkspaceDto.InviteRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(invitationService.createInvitation(id, userId, request.email(), request.role()));
    }

    @GetMapping("/{id}/invitations")
    public ApiResponse<List<WorkspaceDto.InviteResponse>> getInvitations(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ApiResponse.ok(invitationService.getWorkspaceInvitations(id, userId));
    }

    @DeleteMapping("/{id}/invitations/{invitationId}")
    public ApiResponse<Void> cancelInvitation(@PathVariable UUID id, @PathVariable UUID invitationId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        invitationService.cancelInvitation(id, invitationId, userId);
        return ApiResponse.ok();
    }

    @PatchMapping("/{id}/members/{memberId}/role")
    public ApiResponse<Void> changeMemberRole(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @Valid @RequestBody WorkspaceDto.RoleChangeRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        workspaceService.changeMemberRole(id, memberId, request.role(), userId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ApiResponse<Void> removeMember(@PathVariable UUID id, @PathVariable UUID memberId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        workspaceService.removeMember(id, memberId, userId);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/leave")
    public ApiResponse<Void> leaveWorkspace(@PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        workspaceService.leaveWorkspace(id, userId);
        return ApiResponse.ok();
    }
}
