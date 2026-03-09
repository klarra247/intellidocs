package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import com.intellidocs.domain.workspace.entity.Workspace;
import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionAccessService {

    private final ChatSessionRepository chatSessionRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional(readOnly = true)
    public ChatSession getSessionWithAccessCheck(UUID sessionId, UUID userId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> BusinessException.notFound("ChatSession", sessionId));

        // 생성자는 항상 접근 가능
        if (session.isCreator(userId)) {
            return session;
        }

        // 공유된 세션이고 같은 워크스페이스 멤버인 경우 접근 가능
        if (Boolean.TRUE.equals(session.getIsShared()) && session.getWorkspaceId() != null) {
            boolean isMember = workspaceMemberRepository
                    .existsByWorkspaceIdAndUserId(session.getWorkspaceId(), userId);
            if (isMember) {
                return session;
            }
        }

        throw BusinessException.forbidden("이 채팅 세션에 접근할 수 없습니다");
    }

    @Transactional(readOnly = true)
    public boolean isPersonalWorkspace(UUID workspaceId) {
        if (workspaceId == null) return true;
        return workspaceRepository.findById(workspaceId)
                .map(Workspace::isPersonal)
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean isAdminOrOwner(UUID workspaceId, UUID userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(WorkspaceMember::isAdminOrOwner)
                .orElse(false);
    }
}
