package com.intellidocs.domain.auth.service;

import com.intellidocs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    private static final String LOGIN_FAIL_PREFIX = "auth:login-fail:";
    private static final int MAX_ATTEMPTS = 5;
    private static final long BLOCK_DURATION_SECONDS = 300; // 5 minutes

    /**
     * 로그인 시도 전 차단 여부 확인
     */
    public void checkRateLimit(String clientIp) {
        try {
            String key = LOGIN_FAIL_PREFIX + clientIp;
            String countStr = redisTemplate.opsForValue().get(key);
            if (countStr != null && Integer.parseInt(countStr) >= MAX_ATTEMPTS) {
                throw BusinessException.tooManyRequests(
                        "로그인 시도 횟수를 초과했습니다. 5분 후 다시 시도해주세요");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // fail-open: Redis 장애 시 통과
            log.warn("Rate limit check failed (fail-open): {}", e.getMessage());
        }
    }

    /**
     * 로그인 실패 시 카운트 증가
     */
    public void recordLoginFailure(String clientIp) {
        try {
            String key = LOGIN_FAIL_PREFIX + clientIp;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofSeconds(BLOCK_DURATION_SECONDS));
            }
        } catch (Exception e) {
            log.warn("Rate limit record failed: {}", e.getMessage());
        }
    }

    /**
     * 로그인 성공 시 카운트 초기화
     */
    public void resetLoginAttempts(String clientIp) {
        try {
            redisTemplate.delete(LOGIN_FAIL_PREFIX + clientIp);
        } catch (Exception e) {
            log.warn("Rate limit reset failed: {}", e.getMessage());
        }
    }
}
