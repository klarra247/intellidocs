-- ═══════════════════════════════════════════════════════════════
-- IntelliDocs Phase 9~12 프로덕션 마이그레이션
-- 실행 전 반드시 DB 백업: pg_dump -Fc intellidocs > backup_$(date +%Y%m%d).dump
--
-- 적용 대상: Phase 8까지 배포된 프로덕션 DB
-- 모든 DDL에 IF NOT EXISTS / IF EXISTS 사용 → 멱등성 보장 (재실행 안전)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────
-- Phase 9: 채팅 협업 (세션 공유, 핀, 코멘트, 읽음 상태)
-- ───────────────────────────────────────────

-- chat_sessions 컬럼 추가
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS creator_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_shared ON chat_sessions(workspace_id, is_shared);

-- chat_messages 컬럼 추가
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS selected_documents JSONB;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_pinned ON chat_messages(session_id) WHERE is_pinned = TRUE;

-- 세션 읽음 상태
CREATE TABLE IF NOT EXISTS session_read_status (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id    UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- 메시지 코멘트 (채팅)
CREATE TABLE IF NOT EXISTS comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_message ON comments(message_id);

-- ───────────────────────────────────────────
-- Phase 9: 문서 코멘트 + 리뷰
-- ───────────────────────────────────────────

-- 문서 코멘트
CREATE TABLE IF NOT EXISTS document_comments (
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
CREATE INDEX IF NOT EXISTS idx_doc_comments_document ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_document_resolved ON document_comments(document_id, resolved);

-- documents 리뷰 컬럼 추가
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'NONE';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_requested_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- ───────────────────────────────────────────
-- Phase 10: 문서 버전 관리 + Diff
-- ───────────────────────────────────────────

-- documents 버전 컬럼 추가
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_group_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_version_group ON documents(version_group_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent_version ON documents(parent_version_id);

-- 기존 문서에 version_group_id 설정 (자기 자신 = v1)
UPDATE documents SET version_group_id = id WHERE version_group_id IS NULL;

-- Diff 결과
CREATE TABLE IF NOT EXISTS document_version_diffs (
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
CREATE INDEX IF NOT EXISTS idx_version_diffs_source ON document_version_diffs(source_document_id);
CREATE INDEX IF NOT EXISTS idx_version_diffs_target ON document_version_diffs(target_document_id);
CREATE INDEX IF NOT EXISTS idx_version_diffs_workspace ON document_version_diffs(workspace_id);

-- ───────────────────────────────────────────
-- Phase 11: Knowledge Graph (v2 — document_metrics)
-- ───────────────────────────────────────────

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

-- ───────────────────────────────────────────
-- Phase 12: 알림 시스템
-- ───────────────────────────────────────────

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

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- 검증 쿼리 (마이그레이션 후 실행하여 확인)
-- ═══════════════════════════════════════════════════════════════
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
--
-- 기대 결과 (17+ 테이블):
--   chat_messages, chat_sessions, comments, discrepancy_results,
--   document_chunks, document_comments, document_metrics,
--   document_version_diffs, documents, notifications, refresh_tokens,
--   reports, session_read_status, users, workspace_invitations,
--   workspace_members, workspaces
