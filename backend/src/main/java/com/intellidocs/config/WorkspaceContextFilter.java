package com.intellidocs.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.workspace.entity.Workspace;
import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import com.intellidocs.domain.workspace.entity.WorkspaceMemberRole;
import com.intellidocs.domain.workspace.entity.WorkspaceType;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceContextFilter extends OncePerRequestFilter {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ObjectMapper objectMapper;

    private static final String WORKSPACE_HEADER = "X-Workspace-Id";
    private static final String WORKSPACE_PARAM = "workspaceId";
    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    private static final Set<String> SKIP_PATTERNS = Set.of(
            "/api/v1/auth/**",
            "/api/v1/workspaces/**",
            "/api/v1/invitations/**",
            "/actuator/**"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        for (String pattern : SKIP_PATTERNS) {
            if (pathMatcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            UUID userId = getAuthenticatedUserId();
            if (userId == null) {
                // dev mode: no auth → use dev user's personal workspace
                userId = SecurityContextHelper.getCurrentUserId();
            }

            UUID workspaceId = extractWorkspaceId(request);

            if (workspaceId == null) {
                // No workspace specified → use personal workspace
                Workspace personal = workspaceRepository.findByOwnerIdAndType(userId, WorkspaceType.PERSONAL)
                        .orElse(null);
                if (personal != null) {
                    WorkspaceContext.set(personal.getId(), WorkspaceMemberRole.OWNER);
                }
            } else {
                // Workspace specified → verify membership
                WorkspaceMember member = workspaceMemberRepository
                        .findByWorkspaceIdAndUserId(workspaceId, userId)
                        .orElse(null);

                if (member == null) {
                    sendForbiddenResponse(response, "워크스페이스에 접근 권한이 없습니다");
                    return;
                }

                WorkspaceContext.set(workspaceId, member.getRole());
            }

            filterChain.doFilter(request, response);
        } finally {
            WorkspaceContext.clear();
        }
    }

    private UUID getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UUID userId) {
            return userId;
        }
        return null;
    }

    private UUID extractWorkspaceId(HttpServletRequest request) {
        // 1. Header
        String headerValue = request.getHeader(WORKSPACE_HEADER);
        if (StringUtils.hasText(headerValue)) {
            try {
                return UUID.fromString(headerValue);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid X-Workspace-Id header: {}", headerValue);
            }
        }

        // 2. Query parameter
        String paramValue = request.getParameter(WORKSPACE_PARAM);
        if (StringUtils.hasText(paramValue)) {
            try {
                return UUID.fromString(paramValue);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid workspaceId parameter: {}", paramValue);
            }
        }

        return null;
    }

    private void sendForbiddenResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                objectMapper.writeValueAsString(ApiResponse.error("FORBIDDEN", message)));
    }
}
