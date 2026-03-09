-- ─────────────────────────────────────────
-- 워크스페이스 확장 마이그레이션
-- 실행: psql -U intellidocs -d intellidocs -f migration-workspace.sql
-- ─────────────────────────────────────────

-- 1. workspaces 테이블 확장
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. workspace_members 테이블 생성
CREATE TABLE IF NOT EXISTS workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- 3. workspace_invitations 테이블 생성
CREATE TABLE IF NOT EXISTS workspace_invitations (
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
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);

-- 4. reports, discrepancy_results에 workspace_id 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE discrepancy_results ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 5. 기존 documents, chat_sessions의 workspace_id FK에 ON DELETE CASCADE 추가
-- (기존 FK 제거 후 CASCADE 포함하여 재생성)
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- documents.workspace_id FK 재생성
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'documents' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'workspace_id';
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE documents DROP CONSTRAINT %I', fk_name);
    END IF;
    ALTER TABLE documents ADD CONSTRAINT fk_documents_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

    -- chat_sessions.workspace_id FK 재생성
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'chat_sessions' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'workspace_id';
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE chat_sessions DROP CONSTRAINT %I', fk_name);
    END IF;
    ALTER TABLE chat_sessions ADD CONSTRAINT fk_chat_sessions_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
END $$;

-- 6. 기존 사용자별 개인 워크스페이스 생성 + 데이터 backfill
DO $$
DECLARE
    r RECORD;
    ws_id UUID;
BEGIN
    -- 각 사용자별 개인 워크스페이스가 없으면 생성
    FOR r IN SELECT id, name, email FROM users LOOP
        SELECT id INTO ws_id FROM workspaces
        WHERE owner_id = r.id AND type = 'PERSONAL' LIMIT 1;

        IF ws_id IS NULL THEN
            ws_id := gen_random_uuid();
            INSERT INTO workspaces (id, name, owner_id, type, max_members, created_at, updated_at)
            VALUES (ws_id, COALESCE(r.name, r.email) || '의 워크스페이스', r.id, 'PERSONAL', 1, NOW(), NOW());

            -- 멤버로 등록
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (ws_id, r.id, 'OWNER');
        END IF;

        -- documents backfill
        UPDATE documents SET workspace_id = ws_id
        WHERE user_id = r.id AND workspace_id IS NULL;

        -- chat_sessions backfill
        UPDATE chat_sessions SET workspace_id = ws_id
        WHERE user_id = r.id AND workspace_id IS NULL;

        -- reports backfill
        UPDATE reports SET workspace_id = ws_id
        WHERE user_id = r.id AND workspace_id IS NULL;

        -- discrepancy_results backfill
        UPDATE discrepancy_results SET workspace_id = ws_id
        WHERE user_id = r.id AND workspace_id IS NULL;
    END LOOP;
END $$;
