-- ============================================================
-- Migration 015 - Phase 0: Knowledge Folder System Schema
-- Extends the existing folders table to act as a full Knowledge Container.
-- ============================================================

-- 1. Extend the folders table additively
ALTER TABLE folders ADD COLUMN cover_image_path TEXT;
ALTER TABLE folders ADD COLUMN subject TEXT;
ALTER TABLE folders ADD COLUMN semester TEXT;
ALTER TABLE folders ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN trashed_at TEXT;
ALTER TABLE folders ADD COLUMN password_hash TEXT;
ALTER TABLE folders ADD COLUMN sharing_config_json TEXT;

-- 2. Create the mapping table for folder tags
CREATE TABLE IF NOT EXISTS folder_tags (
    folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (folder_id, tag_id)
);

-- 3. Create folder notes for folder-scoped markdown notes
CREATE TABLE IF NOT EXISTS folder_notes (
    id          TEXT PRIMARY KEY,
    folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    title       TEXT,
    body_md     TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'note', -- 'note' | 'study_plan' | 'assignment' | 'revision'
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- 4. Create cache table for expensive aggregate stats
CREATE TABLE IF NOT EXISTS folder_statistics_cache (
    folder_id         TEXT PRIMARY KEY REFERENCES folders(id) ON DELETE CASCADE,
    lecture_count     INTEGER NOT NULL DEFAULT 0,
    study_hours       REAL NOT NULL DEFAULT 0,
    storage_bytes     INTEGER NOT NULL DEFAULT 0,
    flashcard_count   INTEGER NOT NULL DEFAULT 0,
    quiz_count        INTEGER NOT NULL DEFAULT 0,
    note_count        INTEGER NOT NULL DEFAULT 0,
    completion_pct    REAL NOT NULL DEFAULT 0,
    computed_at       TEXT NOT NULL
);

-- 5. Add necessary indices
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_trashed ON folders(trashed_at);
CREATE INDEX IF NOT EXISTS idx_folder_notes_folder ON folder_notes(folder_id);
