package com.intellidocs.domain.workspace.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.workspace.dto.WorkspaceDto;
import com.intellidocs.domain.workspace.service.InvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final UserRepository userRepository;

    @PostMapping("/{token}/accept")
    public ApiResponse<Void> accept(@PathVariable String token) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        invitationService.acceptInvitation(token, userId);
        return ApiResponse.ok();
    }

    @PostMapping("/{token}/decline")
    public ApiResponse<Void> decline(@PathVariable String token) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        invitationService.declineInvitation(token, userId);
        return ApiResponse.ok();
    }

    @GetMapping("/pending")
    public ApiResponse<List<WorkspaceDto.PendingInvitationResponse>> getPending() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ApiResponse.ok(List.of());
        return ApiResponse.ok(invitationService.getPendingInvitations(user.getEmail()));
    }
}
