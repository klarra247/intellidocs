-- ─────────────────────────────────────────
-- IntelliDocs PostgreSQL 초기 스키마
-- ─────────────────────────────────────────

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 유저
-- ─────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    plan        VARCHAR(50) DEFAULT 'free',   -- free | pro | team
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 워크스페이스 (팀 단위 - V2에서 확장)
-- ─────────────────────────────────────────
CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    owner_id    UUID REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 문서
-- ─────────────────────────────────────────
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID REFERENCES workspaces(id),
    user_id         UUID REFERENCES users(id),
    filename        VARCHAR(500) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    file_type       VARCHAR(50) NOT NULL,     -- pdf | xlsx | docx | txt
    file_size       BIGINT,
    storage_path    VARCHAR(1000),            -- S3 or local path
    status          VARCHAR(50) DEFAULT 'uploaded',
    -- uploaded | parsing | indexing | indexed | failed
    error_message   TEXT,
    page_count      INTEGER,
    chunk_count     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_status ON documents(status);

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
    workspace_id    UUID REFERENCES workspaces(id),
    user_id         UUID REFERENCES users(id),
    title           VARCHAR(500),             -- 첫 질문 기반 자동 생성
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 채팅 메시지
-- ─────────────────────────────────────────
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,     -- user | assistant
    content         TEXT NOT NULL,
    table_data      JSONB,                    -- 표 형태 응답 데이터
    source_chunks   JSONB,                    -- 참조한 청크 목록
    tool_calls      JSONB,                    -- Agent가 호출한 Tool 기록
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);

-- ─────────────────────────────────────────
-- 파싱 작업 큐 추적 (RabbitMQ 보완용)
-- ─────────────────────────────────────────
CREATE TABLE parsing_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID REFERENCES documents(id),
    status          VARCHAR(50) DEFAULT 'queued',
    -- queued | processing | completed | failed
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
