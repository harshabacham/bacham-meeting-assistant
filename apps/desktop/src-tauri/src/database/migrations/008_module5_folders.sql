-- ============================================================
-- Migration 008 — Module 5: Folder System Re-architecture
-- Restricts folders to a maximum of 1 level of nesting,
-- adds new organizational columns, and drops the closure table.
-- ============================================================

-- 1. Flatten existing hierarchies
-- Any folder whose parent itself has a parent is moved to the root.
-- This ensures maximum depth is exactly 1 (Root -> Child).
UPDATE folders 
SET parent_id = NULL 
WHERE parent_id IN (
    SELECT id FROM folders WHERE parent_id IS NOT NULL
);

-- 2. Drop the folder_closure table since deep nesting is no longer supported
DROP TABLE IF EXISTS folder_closure;

-- 3. Add new columns to support UI and locking
ALTER TABLE folders ADD COLUMN icon TEXT;
ALTER TABLE folders ADD COLUMN description TEXT;
ALTER TABLE folders ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN is_locked BOOLEAN DEFAULT 0;
ALTER TABLE folders ADD COLUMN lock_passcode_hash TEXT;
