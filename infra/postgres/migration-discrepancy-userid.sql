-- Migration: Add user_id to discrepancy_results
-- Run this on existing databases before deploying the new backend version.

-- 1. Add column (nullable initially for migration)
ALTER TABLE discrepancy_results ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Backfill existing rows: assign to the dev fallback user
UPDATE discrepancy_results SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;

-- 3. Make NOT NULL + add FK
ALTER TABLE discrepancy_results ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE discrepancy_results ADD CONSTRAINT fk_discrepancy_user FOREIGN KEY (user_id) REFERENCES users(id);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_discrepancy_user ON discrepancy_results(user_id);
