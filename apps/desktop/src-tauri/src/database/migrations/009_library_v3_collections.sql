-- ============================================================
-- Migration 009 — Phase 0: Knowledge Library Organization
-- ============================================================

CREATE TABLE IF NOT EXISTS collections (
    id              TEXT PRIMARY KEY,       -- uuid
    name            TEXT NOT NULL,
    color           TEXT,                   -- hex, nullable
    icon            TEXT,                   -- icon key, nullable
    is_smart        INTEGER NOT NULL DEFAULT 0, -- 0 = user-created, 1 = system smart collection
    smart_rule_json TEXT,                   -- serialized filter rule, only for smart collections
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Many-to-many: a lecture belongs to zero or many collections, never duplicated
CREATE TABLE IF NOT EXISTS collection_lectures (
    collection_id   TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    lecture_id      TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    added_at        TEXT NOT NULL,
    PRIMARY KEY (collection_id, lecture_id)
);

-- Note: folder_id, is_favorite, is_archived already exist in lectures.
ALTER TABLE lectures ADD COLUMN trashed_at TEXT;              -- NULL = not trashed
ALTER TABLE lectures ADD COLUMN custom_sort_order INTEGER;
ALTER TABLE lectures ADD COLUMN last_opened_at TEXT;
ALTER TABLE lectures ADD COLUMN last_studied_at TEXT;
ALTER TABLE lectures ADD COLUMN notes TEXT;
ALTER TABLE lectures ADD COLUMN tags_flat TEXT;

-- Global undo log
CREATE TABLE IF NOT EXISTS action_history (
    id              TEXT PRIMARY KEY,
    action_type     TEXT NOT NULL,          -- 'move' | 'delete' | 'rename' | 'archive' | 'batch' | ...
    payload_json    TEXT NOT NULL,          -- enough state to invert the action
    inverse_json    TEXT NOT NULL,          -- precomputed inverse operation
    created_at      TEXT NOT NULL,
    expires_at      TEXT NOT NULL,          -- undo window cutoff
    undone          INTEGER NOT NULL DEFAULT 0
);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS lectures_fts USING fts5(
    title, transcript, summary, ocr_text, notes, tags_flat
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_lectures_trashed ON lectures(trashed_at);
CREATE INDEX IF NOT EXISTS idx_collection_lectures_lecture ON collection_lectures(lecture_id);

-- FTS5 Triggers
CREATE TRIGGER IF NOT EXISTS lectures_ai AFTER INSERT ON lectures BEGIN
    INSERT INTO lectures_fts(rowid, title, notes, tags_flat)
    VALUES (new.rowid, new.title, new.notes, new.tags_flat);
END;

CREATE TRIGGER IF NOT EXISTS lectures_ad AFTER DELETE ON lectures BEGIN
    INSERT INTO lectures_fts(lectures_fts, rowid, title, notes, tags_flat)
    VALUES ('delete', old.rowid, old.title, old.notes, old.tags_flat);
END;

CREATE TRIGGER IF NOT EXISTS lectures_au AFTER UPDATE ON lectures BEGIN
    INSERT INTO lectures_fts(lectures_fts, rowid, title, notes, tags_flat)
    VALUES ('delete', old.rowid, old.title, old.notes, old.tags_flat);
    INSERT INTO lectures_fts(rowid, title, notes, tags_flat)
    VALUES (new.rowid, new.title, new.notes, new.tags_flat);
END;
