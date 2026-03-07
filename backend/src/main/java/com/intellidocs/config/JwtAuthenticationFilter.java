package com.intellidocs.config;

import com.intellidocs.domain.auth.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    /** /api/v1/auth/** 전체를 필터 스킵 대상으로 지정 */
    private static final Set<String> SKIP_PATTERNS = Set.of(
            "/api/v1/auth/**"
    );

    /** 단, /auth/me 와 /auth/password 는 인증이 필요하므로 스킵하지 않음 */
    private static final Set<String> NO_SKIP_PATTERNS = Set.of(
            "/api/v1/auth/me",
            "/api/v1/auth/password"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        // /auth/me, /auth/password는 인증 필요 → 필터 적용
        for (String noSkip : NO_SKIP_PATTERNS) {
            if (pathMatcher.match(noSkip, path)) {
                return false;
            }
        }

        // 나머지 /auth/** 경로는 필터 스킵 (login, register, refresh 등)
        for (String skip : SKIP_PATTERNS) {
            if (pathMatcher.match(skip, path)) {
                return true;
            }
        }

        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && jwtService.isTokenValid(token)) {
            try {
                UUID userId = jwtService.extractUserId(token);
                String email = jwtService.extractEmail(token);
                String role = jwtService.extractRole(token);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT authenticated user: {} ({})", email, userId);
            } catch (Exception e) {
                log.debug("Failed to set authentication from JWT: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Authorization 헤더 또는 query param에서 JWT 추출.
     * SSE EventSource는 커스텀 헤더를 보낼 수 없으므로 ?token= 쿼리 파라미터 폴백 지원.
     */
    private String extractToken(HttpServletRequest request) {
        // 1) Authorization: Bearer {token}
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }

        // 2) ?token={jwt} (SSE EventSource fallback)
        String queryToken = request.getParameter("token");
        if (StringUtils.hasText(queryToken)) {
            return queryToken;
        }

        return null;
    }
}
