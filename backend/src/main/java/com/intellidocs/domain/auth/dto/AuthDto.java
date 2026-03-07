package com.intellidocs.domain.auth.dto;

import com.intellidocs.domain.auth.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public class AuthDto {

    // === Requests ===

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String name,
            @NotBlank @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$",
                    message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다")
            String password
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record GoogleLoginRequest(
            @NotBlank String idToken
    ) {}

    public record RefreshRequest(
            @NotBlank String refreshToken
    ) {}

    public record LogoutRequest(
            @NotBlank String refreshToken
    ) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$",
                    message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다")
            String newPassword
    ) {}

    // === Responses ===

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresIn
    ) {}

    public record AuthResponse(
            TokenResponse token,
            UserResponse user
    ) {}

    public record UserResponse(
            UUID id,
            String email,
            String name,
            String profileImageUrl,
            String authProvider,
            boolean emailVerified,
            String role
    ) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getName(),
                    user.getProfileImageUrl(),
                    user.getAuthProvider().name(),
                    user.getEmailVerified(),
                    user.getRole().name()
            );
        }
    }
}
