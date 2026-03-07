package com.intellidocs.domain.auth.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.dto.AuthDto;
import com.intellidocs.domain.auth.entity.AuthProvider;
import com.intellidocs.domain.auth.entity.RefreshToken;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.RefreshTokenRepository;
import com.intellidocs.domain.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        // 1. Check email duplicate
        if (userRepository.existsByEmail(request.email())) {
            throw BusinessException.conflict("이미 사용 중인 이메일입니다");
        }

        // 2. Create User with BCrypt hash
        User user = User.builder()
                .email(request.email())
                .name(request.name())
                .passwordHash(passwordEncoder.encode(request.password()))
                .emailVerified(false)
                .build();
        userRepository.save(user);

        log.info("New user registered: email={}", request.email());

        // 3. Generate tokens + return
        return createAuthResponse(user);
    }

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request, String clientIp) {
        // 0. Rate limit check
        rateLimitService.checkRateLimit(clientIp);

        // 1. Find user by email
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> {
                    rateLimitService.recordLoginFailure(clientIp);
                    return BusinessException.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다");
                });

        // 2. Check if OAuth account (no password login)
        if (user.getAuthProvider() != AuthProvider.LOCAL) {
            throw BusinessException.badRequest(user.getAuthProvider().name() + " 계정으로 로그인해주세요");
        }

        // 3. Verify password
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            rateLimitService.recordLoginFailure(clientIp);
            throw BusinessException.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다");
        }

        // 4. Reset rate limit on success
        rateLimitService.resetLoginAttempts(clientIp);

        // 5. Update last login + return tokens
        user.updateLastLogin();
        log.info("User logged in: email={}", request.email());
        return createAuthResponse(user);
    }

    @Transactional
    public AuthDto.TokenResponse refresh(AuthDto.RefreshRequest request) {
        // 1. Find refresh token
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> BusinessException.unauthorized("유효하지 않은 리프레시 토큰입니다"));

        // 2. Validate (not revoked, not expired)
        if (!refreshToken.isValid()) {
            throw BusinessException.unauthorized("만료된 리프레시 토큰입니다");
        }

        // 3. Token rotation: revoke old, issue new
        refreshToken.revoke();
        User user = refreshToken.getUser();

        // Generate new tokens
        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String newRefreshTokenStr = jwtService.generateRefreshToken();
        saveRefreshToken(user, newRefreshTokenStr);

        return new AuthDto.TokenResponse(
                newAccessToken, newRefreshTokenStr, "Bearer",
                jwtService.getRefreshExpirationMs() / 1000
        );
    }

    @Transactional
    public void logout(AuthDto.LogoutRequest request) {
        refreshTokenRepository.findByToken(request.refreshToken())
                .ifPresent(RefreshToken::revoke);
    }

    public AuthDto.UserResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));
        return AuthDto.UserResponse.from(user);
    }

    @Transactional
    public void changePassword(UUID userId, AuthDto.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("User", userId));

        // OAuth accounts can't change password
        if (user.getAuthProvider() != AuthProvider.LOCAL) {
            throw BusinessException.badRequest("소셜 로그인 계정은 비밀번호를 변경할 수 없습니다");
        }

        // Verify current password
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw BusinessException.unauthorized("현재 비밀번호가 올바르지 않습니다");
        }

        // Update password
        user.changePassword(passwordEncoder.encode(request.newPassword()));

        // Revoke all refresh tokens (force re-login on all devices)
        refreshTokenRepository.findByUserIdAndRevokedFalse(userId)
                .forEach(RefreshToken::revoke);

        log.info("Password changed for user: id={}", userId);
    }

    // === Private helpers ===

    private AuthDto.AuthResponse createAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshTokenStr = jwtService.generateRefreshToken();
        saveRefreshToken(user, refreshTokenStr);

        AuthDto.TokenResponse tokenResponse = new AuthDto.TokenResponse(
                accessToken, refreshTokenStr, "Bearer", jwtService.getRefreshExpirationMs() / 1000);
        return new AuthDto.AuthResponse(tokenResponse, AuthDto.UserResponse.from(user));
    }

    private void saveRefreshToken(User user, String tokenStr) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(tokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMs() / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);
    }
}
