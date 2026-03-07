package com.intellidocs.domain.auth.service;

import com.intellidocs.domain.auth.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    private static final UUID TEST_USER_ID = UUID.randomUUID();
    private static final String TEST_EMAIL = "test@example.com";
    private static final UserRole TEST_ROLE = UserRole.USER;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
                "test-secret-key-for-jwt-signing-at-least-32-chars");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 60000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpirationMs", 120000L);
        jwtService.init();
    }

    @Test
    void generateAccessToken_containsCorrectClaims() {
        String token = jwtService.generateAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_ROLE);

        assertThat(token).isNotBlank();

        UUID extractedUserId = jwtService.extractUserId(token);
        String extractedEmail = jwtService.extractEmail(token);
        String extractedRole = jwtService.extractRole(token);

        assertThat(extractedUserId).isEqualTo(TEST_USER_ID);
        assertThat(extractedEmail).isEqualTo(TEST_EMAIL);
        assertThat(extractedRole).isEqualTo(TEST_ROLE.name());
    }

    @Test
    void isTokenValid_withValidToken_returnsTrue() {
        String token = jwtService.generateAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_ROLE);

        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_withExpiredToken_returnsFalse() {
        // Set expiration to 0ms so token expires immediately
        ReflectionTestUtils.setField(jwtService, "expirationMs", 0L);

        String token = jwtService.generateAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_ROLE);

        assertThat(jwtService.isTokenValid(token)).isFalse();
    }

    @Test
    void isTokenValid_withTamperedToken_returnsFalse() {
        String token = jwtService.generateAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_ROLE);

        // Tamper with the token by modifying a character in the signature (last part)
        char[] chars = token.toCharArray();
        int lastDot = token.lastIndexOf('.');
        int tamperIndex = lastDot + 1;
        chars[tamperIndex] = chars[tamperIndex] == 'a' ? 'b' : 'a';
        String tamperedToken = new String(chars);

        assertThat(jwtService.isTokenValid(tamperedToken)).isFalse();
    }

    @Test
    void extractUserId_returnsCorrectId() {
        String token = jwtService.generateAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_ROLE);

        UUID extractedId = jwtService.extractUserId(token);

        assertThat(extractedId).isEqualTo(TEST_USER_ID);
    }

    @Test
    void generateRefreshToken_returnsUniqueValues() {
        String token1 = jwtService.generateRefreshToken();
        String token2 = jwtService.generateRefreshToken();

        assertThat(token1).isNotBlank();
        assertThat(token2).isNotBlank();
        assertThat(token1).isNotEqualTo(token2);
    }
}
