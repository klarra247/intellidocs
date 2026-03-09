-- ─────────────────────────────────────────
-- 채팅 협업 기능 마이그레이션
-- chat_sessions 공유, chat_messages 핀, 읽음 상태, 코멘트
-- ─────────────────────────────────────────

-- chat_sessions: 공유 컬럼
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS creator_name VARCHAR(100);
UPDATE chat_sessions cs SET creator_name = u.name FROM users u WHERE cs.user_id = u.id AND cs.creator_name IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_shared ON chat_sessions(workspace_id, is_shared);

-- chat_messages: 핀 컬럼
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_pinned ON chat_messages(session_id) WHERE is_pinned = TRUE;

-- session_read_status
CREATE TABLE IF NOT EXISTS session_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_message ON comments(message_id);
