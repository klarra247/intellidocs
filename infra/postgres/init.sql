-- ─────────────────────────────────────────
-- IntelliDocs PostgreSQL 초기 스키마
-- ─────────────────────────────────────────

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 유저
-- ─────────────────────────────────────────
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             VARCHAR(255) UNIQUE NOT NULL,
    name              VARCHAR(255),
    password_hash     VARCHAR(255),
    profile_image_url VARCHAR(500),
    auth_provider     VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    provider_id       VARCHAR(255),
    email_verified    BOOLEAN DEFAULT FALSE,
    role              VARCHAR(20) NOT NULL DEFAULT 'USER',
    plan              VARCHAR(50) DEFAULT 'free',   -- free | pro | team
    last_login_at     TIMESTAMP,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(auth_provider, provider_id)
);

-- ─────────────────────────────────────────
-- 개발용 더미 데이터 (JWT 미구현 Phase 1)
-- ─────────────────────────────────────────
INSERT INTO users (id, email, name, password_hash, auth_provider, email_verified, role, plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'dev@intellidocs.local', 'Dev User',
     '$2a$10$dummyhashfordevuser000000000000000000000000', 'LOCAL', TRUE, 'ADMIN', 'pro');

-- 개발용 개인 워크스페이스
INSERT INTO workspaces (id, name, owner_id, type, max_members) VALUES
    ('00000000-0000-0000-0000-000000000010', 'Dev User의 워크스페이스',
     '00000000-0000-0000-0000-000000000001', 'PERSONAL', 1);

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'OWNER');

-- ─────────────────────────────────────────
-- 리프레시 토큰
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ─────────────────────────────────────────
-- 워크스페이스
-- ─────────────────────────────────────────
CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    owner_id        UUID REFERENCES users(id),
    type            VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
    max_members     INTEGER DEFAULT 1,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 워크스페이스 멤버
-- ─────────────────────────────────────────
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ─────────────────────────────────────────
-- 워크스페이스 초대
-- ─────────────────────────────────────────
CREATE TABLE workspace_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    inviter_id      UUID NOT NULL REFERENCES users(id),
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    token           VARCHAR(128) NOT NULL UNIQUE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);

-- ─────────────────────────────────────────
-- 문서
-- ─────────────────────────────────────────
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    filename            VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(500) NOT NULL,
    file_type           VARCHAR(50) NOT NULL,     -- pdf | xlsx | docx | txt
    file_size           BIGINT,
    storage_path        VARCHAR(1000),            -- S3 or local path
    status              VARCHAR(50) DEFAULT 'uploaded',
    -- uploaded | parsing | indexing | indexed | failed
    error_message       TEXT,
    total_pages         INTEGER,
    total_chunks        INTEGER,
    review_status       VARCHAR(20) NOT NULL DEFAULT 'NONE',
    review_requested_by UUID REFERENCES users(id),
    review_requested_at TIMESTAMP,
    reviewed_by         UUID REFERENCES users(id),
    reviewed_at         TIMESTAMP,
    version_group_id    UUID,
    version_number      INTEGER NOT NULL DEFAULT 1,
    parent_version_id   UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_workspace_created ON documents(workspace_id, created_at DESC);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_version_group ON documents(version_group_id);
CREATE INDEX idx_documents_parent_version ON documents(parent_version_id);

-- 마이그레이션: UPDATE documents SET version_group_id = id, version_number = 1 WHERE version_group_id IS NULL;

-- ─────────────────────────────────────────
-- 문서 코멘트
-- ─────────────────────────────────────────
CREATE TABLE document_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    chunk_index     INTEGER,
    page_number     INTEGER,
    content         TEXT NOT NULL,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_doc_comments_document ON document_comments(document_id);
CREATE INDEX idx_doc_comments_document_resolved ON document_comments(document_id, resolved);

-- ─────────────────────────────────────────
-- 문서 청크 메타데이터
-- (실제 벡터/텍스트는 Qdrant/ES에 저장)
-- ─────────────────────────────────────────
CREATE TABLE document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    page_number     INTEGER,
    section_title   VARCHAR(500),
    chunk_type      VARCHAR(50) DEFAULT 'text', -- text | table | heading
    token_count     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);

-- ─────────────────────────────────────────
-- 채팅 세션
-- ─────────────────────────────────────────
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    title           VARCHAR(500),             -- 첫 질문 기반 자동 생성
    is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
    shared_at       TIMESTAMP,
    creator_name    VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_chat_sessions_workspace_created ON chat_sessions(workspace_id, created_at DESC);
CREATE INDEX idx_chat_sessions_workspace_shared ON chat_sessions(workspace_id, is_shared);

-- ─────────────────────────────────────────
-- 채팅 메시지
-- ─────────────────────────────────────────
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,     -- USER | ASSISTANT
    content         TEXT NOT NULL,
    source_chunks   JSONB,                    -- 참조한 청크 목록
    selected_documents JSONB,                 -- USER 메시지의 선택된 문서 스냅샷
    confidence      DOUBLE PRECISION,         -- RRF 기반 응답 신뢰도 [0,1]
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_by       UUID REFERENCES users(id),
    pinned_at       TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_session_pinned ON chat_messages(session_id) WHERE is_pinned = TRUE;

-- ─────────────────────────────────────────
-- 세션 읽음 상태
-- ─────────────────────────────────────────
CREATE TABLE session_read_status (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id    UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- ─────────────────────────────────────────
-- 코멘트
-- ─────────────────────────────────────────
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_comments_message ON comments(message_id);

-- ─────────────────────────────────────────
-- [DEPRECATED] 파싱 작업 상태를 documents.status로 직접 관리하므로 미사용 (2026.03)
-- ─────────────────────────────────────────
-- CREATE TABLE parsing_jobs (
--     id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     document_id     UUID REFERENCES documents(id),
--     status          VARCHAR(50) DEFAULT 'queued',
--     -- queued | processing | completed | failed
--     started_at      TIMESTAMP,
--     completed_at    TIMESTAMP,
--     error_message   TEXT,
--     retry_count     INTEGER DEFAULT 0,
--     created_at      TIMESTAMP DEFAULT NOW()
-- );

-- ─────────────────────────────────────────
-- 분석 리포트
-- ─────────────────────────────────────────
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    report_type     VARCHAR(50) NOT NULL,
    status          VARCHAR(50) DEFAULT 'PENDING',
    storage_path    VARCHAR(1000),
    file_size       BIGINT,
    document_ids    JSONB,
    report_data     JSONB,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_workspace_created ON reports(workspace_id, created_at DESC);

-- ─────────────────────────────────────────
-- 불일치 탐지 결과
-- ─────────────────────────────────────────
CREATE TABLE discrepancy_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    document_ids    JSONB NOT NULL,
    target_fields   JSONB,
    tolerance       DECIMAL(5,4) NOT NULL DEFAULT 0.001,
    trigger_type    VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result_data     JSONB,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_discrepancy_status ON discrepancy_results(status);
CREATE INDEX idx_discrepancy_created ON discrepancy_results(created_at DESC);
CREATE INDEX idx_discrepancy_user ON discrepancy_results(user_id);
CREATE INDEX idx_discrepancy_workspace_created ON discrepancy_results(workspace_id, created_at DESC);

-- ─────────────────────────────────────────
-- 문서 버전 Diff 결과
-- ─────────────────────────────────────────
CREATE TABLE document_version_diffs (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id          UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    diff_type             VARCHAR(20) NOT NULL DEFAULT 'VERSION',
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result_data           JSONB,
    error_message         TEXT,
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_document_id, target_document_id)
);
CREATE INDEX idx_version_diffs_source ON document_version_diffs(source_document_id);
CREATE INDEX idx_version_diffs_target ON document_version_diffs(target_document_id);
CREATE INDEX idx_version_diffs_workspace ON document_version_diffs(workspace_id);

-- ============================================================
-- [DEPRECATED] Knowledge Graph v1 — Phase 11에서 document_metrics로 대체됨 (2026.03)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS entities (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     workspace_id UUID NOT NULL REFERENCES workspaces(id),
--     document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
--     name VARCHAR(300) NOT NULL,
--     normalized_name VARCHAR(300) NOT NULL,
--     entity_type VARCHAR(50) NOT NULL,
--     value VARCHAR(500),
--     period VARCHAR(50),
--     chunk_index INTEGER,
--     page_number INTEGER,
--     metadata JSONB,
--     created_at TIMESTAMP DEFAULT now()
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_entities_workspace ON entities(workspace_id);
-- CREATE INDEX IF NOT EXISTS idx_entities_document ON entities(document_id);
-- CREATE INDEX IF NOT EXISTS idx_entities_normalized ON entities(workspace_id, normalized_name);
-- CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(workspace_id, entity_type);
--
-- CREATE TABLE IF NOT EXISTS entity_relations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     workspace_id UUID NOT NULL REFERENCES workspaces(id),
--     source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
--     target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
--     relation_type VARCHAR(100) NOT NULL,
--     description VARCHAR(500),
--     confidence DECIMAL DEFAULT 0.8,
--     metadata JSONB,
--     created_at TIMESTAMP DEFAULT now(),
--     UNIQUE(source_entity_id, target_entity_id, relation_type)
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_relations_workspace ON entity_relations(workspace_id);
-- CREATE INDEX IF NOT EXISTS idx_relations_source ON entity_relations(source_entity_id);
-- CREATE INDEX IF NOT EXISTS idx_relations_target ON entity_relations(target_entity_id);

-- ============================================================
-- Document Metrics (Knowledge Graph v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    metric_name VARCHAR(200) NOT NULL,
    normalized_metric VARCHAR(200) NOT NULL,
    value VARCHAR(100),
    numeric_value DECIMAL,
    unit VARCHAR(20),
    period VARCHAR(50),
    chunk_index INTEGER,
    page_number INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_metrics_workspace ON document_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_normalized ON document_metrics(workspace_id, normalized_metric);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_document ON document_metrics(document_id);

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    message TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id, created_at DESC);
