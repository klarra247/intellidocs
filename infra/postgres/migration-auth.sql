-- ─────────────────────────────────────────
-- Auth Migration: 기존 DB에 인증 컬럼 추가
-- 기존 users 테이블에 JWT/OAuth 관련 컬럼 추가
-- refresh_tokens 테이블 생성
-- ─────────────────────────────────────────

-- users 테이블에 인증 관련 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- auth_provider + provider_id 복합 유니크 제약조건
-- (이미 존재하면 무시)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_auth_provider_provider_id_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_provider_provider_id_key
            UNIQUE (auth_provider, provider_id);
    END IF;
END $$;

-- 기존 dev user 업데이트
UPDATE users
SET auth_provider = 'LOCAL',
    email_verified = TRUE,
    role = 'ADMIN'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- refresh_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT now()
);

-- 인덱스 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
