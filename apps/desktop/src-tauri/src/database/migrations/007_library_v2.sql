-- ============================================================
-- Migration 007 — Library V2 (Closure Table & Smart Collections)
-- ============================================================

-- Add new columns to folders
ALTER TABLE folders ADD COLUMN color TEXT;
ALTER TABLE folders ADD COLUMN created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000);
ALTER TABLE folders ADD COLUMN updated_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000);

-- Note: We retain parent_id in folders for backward compatibility or simple querying,
-- but the single source of truth for deep nesting will be folder_closure.

-- Create closure table for folders to support infinite nesting efficiently
CREATE TABLE IF NOT EXISTS folder_closure (
    ancestor_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    descendant_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
);

-- Initialize folder_closure for existing folders.
-- 1) Self-reference (depth 0) for all existing folders
INSERT OR IGNORE INTO folder_closure (ancestor_id, descendant_id, depth)
SELECT id, id, 0 FROM folders;

-- 2) Depth 1 relationships for existing parent_id links
INSERT OR IGNORE INTO folder_closure (ancestor_id, descendant_id, depth)
SELECT parent_id, id, 1 FROM folders WHERE parent_id IS NOT NULL;

-- 3) Since existing nesting is likely max 1 level due to lack of a deep UI previously,
-- this covers the immediate relationships. Deep hierarchies will be managed going forward.

-- Add new columns to lectures
ALTER TABLE lectures ADD COLUMN subject TEXT;
ALTER TABLE lectures ADD COLUMN is_archived BOOLEAN DEFAULT 0;
ALTER TABLE lectures ADD COLUMN description TEXT;

-- (is_favorite, deleted_at, course, semester, teacher are already present)

-- Create indices for efficient filtering
CREATE INDEX IF NOT EXISTS idx_lectures_folder ON lectures(folder_id);
CREATE INDEX IF NOT EXISTS idx_lectures_subject ON lectures(subject);
CREATE INDEX IF NOT EXISTS idx_lectures_deleted ON lectures(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lectures_favorite ON lectures(is_favorite);
CREATE INDEX IF NOT EXISTS idx_lectures_archived ON lectures(is_archived);
