package com.intellidocs.domain.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.dto.AuthDto;
import com.intellidocs.domain.auth.entity.AuthProvider;
import com.intellidocs.domain.auth.entity.RefreshToken;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.RefreshTokenRepository;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleOAuthService {

    @Value("${app.auth.google.client-id:}")
    private String googleClientId;

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final WorkspaceService workspaceService;

    /**
     * Google ID Token 검증 + 로그인/회원가입
     */
    @Transactional
    public AuthDto.AuthResponse loginWithGoogle(AuthDto.GoogleLoginRequest request) {
        if (!StringUtils.hasText(googleClientId)) {
            throw BusinessException.badRequest("Google OAuth가 설정되지 않았습니다");
        }

        // 1. Verify Google ID Token
        GoogleIdToken.Payload payload = verifyGoogleToken(request.idToken());

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");
        String googleId = payload.getSubject();

        // 2. Find existing user by provider+providerId
        Optional<User> existingByProvider = userRepository.findByAuthProviderAndProviderId(
                AuthProvider.GOOGLE, googleId);

        if (existingByProvider.isPresent()) {
            // Existing Google user → login
            User user = existingByProvider.get();
            user.updateLastLogin();
            return createAuthResponse(user);
        }

        // 3. Check if email already exists (LOCAL account → link)
        Optional<User> existingByEmail = userRepository.findByEmail(email);
        if (existingByEmail.isPresent()) {
            User user = existingByEmail.get();
            user.linkGoogle(googleId, pictureUrl);
            user.updateLastLogin();
            return createAuthResponse(user);
        }

        // 4. New user → create
        User newUser = User.builder()
                .email(email)
                .name(name)
                .profileImageUrl(pictureUrl)
                .authProvider(AuthProvider.GOOGLE)
                .providerId(googleId)
                .emailVerified(true)
                .build();
        userRepository.save(newUser);
        workspaceService.createPersonalWorkspace(newUser);
        log.info("New Google user registered: email={}", email);
        return createAuthResponse(newUser);
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idTokenStr) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(List.of(googleClientId))
                    .build();
            GoogleIdToken idToken = verifier.verify(idTokenStr);
            if (idToken == null) {
                throw BusinessException.unauthorized("유효하지 않은 Google 토큰입니다");
            }
            return idToken.getPayload();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw BusinessException.unauthorized("Google 인증에 실패했습니다");
        }
    }

    private AuthDto.AuthResponse createAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshTokenStr = jwtService.generateRefreshToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMs() / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthDto.TokenResponse tokenResponse = new AuthDto.TokenResponse(
                accessToken, refreshTokenStr, "Bearer", jwtService.getRefreshExpirationMs() / 1000);
        return new AuthDto.AuthResponse(tokenResponse, AuthDto.UserResponse.from(user));
    }
}
