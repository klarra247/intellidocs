package com.intellidocs.domain.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.dto.AuthDto;
import com.intellidocs.domain.auth.service.AuthService;
import com.intellidocs.domain.auth.service.GoogleOAuthService;
import com.intellidocs.domain.auth.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private GoogleOAuthService googleOAuthService;

    @MockitoBean
    private JwtService jwtService;

    // === Helper builders ===

    private AuthDto.AuthResponse createAuthResponse() {
        UUID userId = UUID.randomUUID();
        AuthDto.TokenResponse tokenResponse = new AuthDto.TokenResponse(
                "access-token-value", "refresh-token-value", "Bearer", 1800);
        AuthDto.UserResponse userResponse = new AuthDto.UserResponse(
                userId, "test@example.com", "Test User", null, "LOCAL", false, "USER");
        return new AuthDto.AuthResponse(tokenResponse, userResponse);
    }

    // === Register tests ===

    @Test
    void register_success_returns201() throws Exception {
        AuthDto.AuthResponse response = createAuthResponse();
        when(authService.register(any(AuthDto.RegisterRequest.class))).thenReturn(response);

        String json = objectMapper.writeValueAsString(
                new AuthDto.RegisterRequest("test@example.com", "Test User", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token.accessToken").value("access-token-value"))
                .andExpect(jsonPath("$.data.user.email").value("test@example.com"));
    }

    @Test
    void register_duplicateEmail_returns409() throws Exception {
        when(authService.register(any(AuthDto.RegisterRequest.class)))
                .thenThrow(BusinessException.conflict("이미 사용 중인 이메일입니다"));

        String json = objectMapper.writeValueAsString(
                new AuthDto.RegisterRequest("dup@example.com", "Dup User", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void register_invalidEmail_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(
                new AuthDto.RegisterRequest("not-an-email", "Test User", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    // === Login tests ===

    @Test
    void login_success_returns200() throws Exception {
        AuthDto.AuthResponse response = createAuthResponse();
        when(authService.login(any(AuthDto.LoginRequest.class), anyString())).thenReturn(response);

        String json = objectMapper.writeValueAsString(
                new AuthDto.LoginRequest("test@example.com", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token.accessToken").value("access-token-value"))
                .andExpect(jsonPath("$.data.user.email").value("test@example.com"));
    }

    @Test
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any(AuthDto.LoginRequest.class), anyString()))
                .thenThrow(BusinessException.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다"));

        String json = objectMapper.writeValueAsString(
                new AuthDto.LoginRequest("wrong@example.com", "WrongPass1!"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    // === Refresh test ===

    @Test
    void refresh_success_returns200() throws Exception {
        AuthDto.TokenResponse tokenResponse = new AuthDto.TokenResponse(
                "new-access-token", "new-refresh-token", "Bearer", 1800);
        when(authService.refresh(any(AuthDto.RefreshRequest.class))).thenReturn(tokenResponse);

        String json = objectMapper.writeValueAsString(
                new AuthDto.RefreshRequest("old-refresh-token"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("new-refresh-token"));
    }

    // === Logout test ===

    @Test
    void logout_success_returns200() throws Exception {
        doNothing().when(authService).logout(any(AuthDto.LogoutRequest.class));

        String json = objectMapper.writeValueAsString(
                new AuthDto.LogoutRequest("refresh-token-to-revoke"));

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
