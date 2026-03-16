package com.intellidocs.domain.workspace.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.service.NotificationService;
import com.intellidocs.domain.workspace.dto.WorkspaceDto;
import com.intellidocs.domain.workspace.entity.*;
import com.intellidocs.domain.workspace.repository.WorkspaceInvitationRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvitationService {

    private final WorkspaceInvitationRepository invitationRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_LENGTH = 64;
    private static final int INVITATION_EXPIRY_DAYS = 7;

    @Transactional
    public WorkspaceDto.InviteResponse createInvitation(UUID workspaceId, UUID inviterId,
                                                        String email, WorkspaceMemberRole role) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> BusinessException.notFound("Workspace", workspaceId));

        // Validate inviter is OWNER or ADMIN
        WorkspaceMember inviter = memberRepository.findByWorkspaceIdAndUserId(workspaceId, inviterId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));
        if (!inviter.isAdminOrOwner()) {
            throw BusinessException.forbidden("초대 권한이 없습니다");
        }

        // Check if already a member
        userRepository.findByEmail(email).ifPresent(user -> {
            if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
                throw BusinessException.conflict("이미 워크스페이스 멤버입니다");
            }
        });

        // Check if invitation already pending
        if (invitationRepository.existsByWorkspaceIdAndEmailAndStatus(
                workspaceId, email, InvitationStatus.PENDING)) {
            throw BusinessException.conflict("이미 초대가 발송되었습니다");
        }

        // Check capacity
        long currentMembers = memberRepository.countByWorkspaceId(workspaceId);
        if (currentMembers >= workspace.getMaxMembers()) {
            throw BusinessException.badRequest("워크스페이스 정원이 초과되었습니다 (최대: " + workspace.getMaxMembers() + "명)");
        }

        // Prevent OWNER role assignment
        WorkspaceMemberRole assignRole = (role == null || role == WorkspaceMemberRole.OWNER)
                ? WorkspaceMemberRole.MEMBER : role;

        String token = generateToken();
        WorkspaceInvitation invitation = WorkspaceInvitation.builder()
                .workspaceId(workspaceId)
                .inviterId(inviterId)
                .email(email)
                .role(assignRole)
                .token(token)
                .expiresAt(LocalDateTime.now().plusDays(INVITATION_EXPIRY_DAYS))
                .build();
        invitationRepository.save(invitation);

        try {
            userRepository.findByEmail(email).ifPresent(invitee -> {
                User inviterUser = userRepository.findById(inviterId).orElse(null);
                String inviterName = inviterUser != null ? inviterUser.getName() : "알 수 없음";
                notificationService.createNotification(
                        invitee.getId(),
                        inviterId,
                        workspaceId,
                        NotificationType.WORKSPACE_INVITATION,
                        "'" + workspace.getName() + "' 워크스페이스에 초대되었습니다",
                        inviterName + "님이 초대했습니다",
                        "workspace",
                        workspaceId
                );
            });
        } catch (Exception e) {
            log.warn("[Notification] Failed to send WORKSPACE_INVITATION notification", e);
        }

        log.info("Invitation created: workspace={}, email={}, role={}", workspaceId, email, assignRole);

        return WorkspaceDto.InviteResponse.builder()
                .invitationId(invitation.getId())
                .token(token)
                .email(email)
                .status(invitation.getStatus())
                .expiresAt(invitation.getExpiresAt())
                .build();
    }

    @Transactional
    public void acceptInvitation(String token, UUID userId) {
        WorkspaceInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> BusinessException.notFound("Invitation", token));

        if (!invitation.isPending()) {
            throw BusinessException.badRequest("이미 처리된 초대입니다");
        }

        if (invitation.isExpired()) {
            throw BusinessException.badRequest("만료된 초대입니다");
        }

        // Verify email matches
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw BusinessException.forbidden("초대 이메일과 현재 사용자 이메일이 일치하지 않습니다");
        }

        // Check if already a member
        if (memberRepository.existsByWorkspaceIdAndUserId(invitation.getWorkspaceId(), userId)) {
            invitation.accept();
            return;
        }

        // Add as member
        WorkspaceMember member = WorkspaceMember.builder()
                .workspaceId(invitation.getWorkspaceId())
                .userId(userId)
                .role(invitation.getRole())
                .build();
        memberRepository.save(member);
        invitation.accept();

        log.info("Invitation accepted: workspace={}, user={}", invitation.getWorkspaceId(), userId);
    }

    @Transactional
    public void declineInvitation(String token, UUID userId) {
        WorkspaceInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> BusinessException.notFound("Invitation", token));

        if (!invitation.isPending()) {
            throw BusinessException.badRequest("이미 처리된 초대입니다");
        }

        // Verify email matches
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw BusinessException.forbidden("초대 이메일과 현재 사용자 이메일이 일치하지 않습니다");
        }

        invitation.decline();
        log.info("Invitation declined: workspace={}, user={}", invitation.getWorkspaceId(), userId);
    }

    public List<WorkspaceDto.PendingInvitationResponse> getPendingInvitations(String email) {
        return invitationRepository.findByEmailAndStatus(email, InvitationStatus.PENDING)
                .stream()
                .filter(inv -> !inv.isExpired())
                .map(inv -> {
                    Workspace workspace = workspaceRepository.findById(inv.getWorkspaceId()).orElse(null);
                    User inviter = userRepository.findById(inv.getInviterId()).orElse(null);

                    return WorkspaceDto.PendingInvitationResponse.builder()
                            .id(inv.getId())
                            .token(inv.getToken())
                            .workspaceName(workspace != null ? workspace.getName() : null)
                            .inviterName(inviter != null ? inviter.getName() : null)
                            .inviterEmail(inviter != null ? inviter.getEmail() : null)
                            .role(inv.getRole())
                            .expiresAt(inv.getExpiresAt())
                            .build();
                }).toList();
    }

    public List<WorkspaceDto.InviteResponse> getWorkspaceInvitations(UUID workspaceId, UUID userId) {
        // Validate user is member
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));
        if (!member.isAdminOrOwner()) {
            throw BusinessException.forbidden("초대 목록 조회 권한이 없습니다");
        }

        return invitationRepository.findByWorkspaceIdAndStatus(workspaceId, InvitationStatus.PENDING)
                .stream()
                .map(inv -> WorkspaceDto.InviteResponse.builder()
                        .invitationId(inv.getId())
                        .token(inv.getToken())
                        .email(inv.getEmail())
                        .status(inv.isExpired() ? InvitationStatus.EXPIRED : inv.getStatus())
                        .expiresAt(inv.getExpiresAt())
                        .build())
                .toList();
    }

    @Transactional
    public void cancelInvitation(UUID workspaceId, UUID invitationId, UUID userId) {
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> BusinessException.forbidden("워크스페이스에 접근 권한이 없습니다"));
        if (!member.isAdminOrOwner()) {
            throw BusinessException.forbidden("초대 취소 권한이 없습니다");
        }

        WorkspaceInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> BusinessException.notFound("Invitation", invitationId));
        if (!invitation.getWorkspaceId().equals(workspaceId)) {
            throw BusinessException.forbidden("해당 워크스페이스의 초대가 아닙니다");
        }

        invitationRepository.delete(invitation);
        log.info("Invitation cancelled: workspace={}, email={}", workspaceId, invitation.getEmail());
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_LENGTH / 2];
        SECURE_RANDOM.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
