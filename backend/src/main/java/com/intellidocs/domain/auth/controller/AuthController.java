package com.intellidocs.domain.auth.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.auth.dto.AuthDto;
import com.intellidocs.domain.auth.service.AuthService;
import com.intellidocs.domain.auth.service.GoogleOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleOAuthService googleOAuthService;

    /**
     * 회원가입
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDto.AuthResponse>> register(
            @RequestBody @Valid AuthDto.RegisterRequest request) {
        AuthDto.AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * 로그인
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDto.AuthResponse>> login(
            @RequestBody @Valid AuthDto.LoginRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        AuthDto.AuthResponse response = authService.login(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Google OAuth 로그인
     */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthDto.AuthResponse>> googleLogin(
            @RequestBody @Valid AuthDto.GoogleLoginRequest request) {
        AuthDto.AuthResponse response = googleOAuthService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 토큰 갱신
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthDto.TokenResponse>> refresh(
            @RequestBody @Valid AuthDto.RefreshRequest request) {
        AuthDto.TokenResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody @Valid AuthDto.LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /**
     * 내 정보 조회
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthDto.UserResponse>> me() {
        UUID userId = extractUserId();
        AuthDto.UserResponse response = authService.me(userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 비밀번호 변경
     */
    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody @Valid AuthDto.ChangePasswordRequest request) {
        UUID userId = extractUserId();
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // === Private helpers ===

    private UUID extractUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
