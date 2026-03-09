-- Migration: Document Comments + Review Status
-- Date: 2026-03-10

-- 문서 코멘트 테이블
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

-- 문서 리뷰 상태 컬럼 추가
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'NONE';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_requested_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
