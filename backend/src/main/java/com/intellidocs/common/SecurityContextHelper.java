package com.intellidocs.common;

import com.intellidocs.common.exception.BusinessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public final class SecurityContextHelper {

    private static final UUID DEV_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private SecurityContextHelper() {}

    /**
     * SecurityContext에서 현재 인증된 userId 추출.
     * 인증 정보가 없으면 dev fallback (TEMP_USER_ID) 반환.
     */
    public static UUID getCurrentUserId() {
        return getAuthenticatedUserId().orElse(DEV_USER_ID);
    }

    /**
     * SecurityContext에서 userId 추출. 없으면 401 throw.
     */
    public static UUID requireCurrentUserId() {
        return getAuthenticatedUserId()
                .orElseThrow(() -> BusinessException.unauthorized("인증이 필요합니다"));
    }

    private static Optional<UUID> getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UUID userId) {
            return Optional.of(userId);
        }
        return Optional.empty();
    }
}
