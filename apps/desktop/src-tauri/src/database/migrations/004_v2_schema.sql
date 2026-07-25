-- ============================================================
-- Migration 004 — BACHAM V2 Schema Additions
-- Additive only. No existing tables or columns are dropped.
-- ============================================================

-- ── Lectures: library metadata ──────────────────────────────
ALTER TABLE lectures ADD COLUMN deleted_at INTEGER;
ALTER TABLE lectures ADD COLUMN color_label TEXT;
ALTER TABLE lectures ADD COLUMN course TEXT;
ALTER TABLE lectures ADD COLUMN semester TEXT;
ALTER TABLE lectures ADD COLUMN teacher TEXT;

-- ── Screenshots: frame selection metadata ────────────────────
ALTER TABLE screenshots ADD COLUMN is_key_frame INTEGER DEFAULT 0;
ALTER TABLE screenshots ADD COLUMN change_reason TEXT;
ALTER TABLE screenshots ADD COLUMN phash TEXT;

-- ── Flashcards: SM-2 spaced repetition fields ────────────────
ALTER TABLE flashcards ADD COLUMN ease_factor REAL DEFAULT 2.5;
ALTER TABLE flashcards ADD COLUMN interval_days INTEGER DEFAULT 1;
ALTER TABLE flashcards ADD COLUMN next_review_at INTEGER;
ALTER TABLE flashcards ADD COLUMN difficulty TEXT DEFAULT 'medium';

-- ── Chat messages: structured references ─────────────────────
ALTER TABLE chat_messages ADD COLUMN references_json TEXT;

-- ── Lecture Artifacts (unified artifact table) ────────────────
-- All AI-generated content lives here (summary, notes, formulas, etc.)
-- 'flashcards', 'quizzes', 'bookmarks', 'chat_messages', 'timeline_events'
-- remain as their own tables due to relational structure.
CREATE TABLE IF NOT EXISTS lecture_artifacts (
    id          TEXT PRIMARY KEY,
    lecture_id  TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    -- Enumerated types:
    -- 'summary' | 'detailed_notes' | 'chapter_breakdown' |
    -- 'important_topics' | 'definitions' | 'formula_sheet' |
    -- 'important_code' | 'cheat_sheet' | 'key_takeaways' |
    -- 'mind_map' | 'action_items' | 'homework' | 'resources'
    content_json TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    model_used  TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'done'
    -- status: 'pending' | 'generating' | 'done' | 'error'
);

CREATE INDEX IF NOT EXISTS idx_artifacts_lecture_type
    ON lecture_artifacts(lecture_id, artifact_type);

-- ── Timeline Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
    id              TEXT PRIMARY KEY,
    lecture_id      TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    -- 'slide_change' | 'topic_change' | 'code_appeared' |
    -- 'formula_appeared' | 'question_asked' | 'important_explanation' |
    -- 'bookmark' | 'ai_insight'
    timestamp_ms    INTEGER NOT NULL,
    label           TEXT NOT NULL,
    screenshot_id   TEXT REFERENCES screenshots(id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_lecture
    ON timeline_events(lecture_id, timestamp_ms);

-- ── Recently Viewed ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
    lecture_id  TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    viewed_at   INTEGER NOT NULL,
    PRIMARY KEY (lecture_id)
);

-- ── Smart Collections (saved filter queries) ──────────────────
CREATE TABLE IF NOT EXISTS smart_collections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    filter_json TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);

-- ── Note Versions (snapshot on save) ─────────────────────────
CREATE TABLE IF NOT EXISTS note_versions (
    id          TEXT PRIMARY KEY,
    note_id     TEXT REFERENCES notes(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    saved_at    INTEGER NOT NULL
);

-- ── Embeddings (opt-in Smart Search) ─────────────────────────
CREATE TABLE IF NOT EXISTS embeddings (
    id              TEXT PRIMARY KEY,
    source_type     TEXT NOT NULL,  -- 'artifact' | 'transcript' | 'note'
    source_id       TEXT NOT NULL,  -- FK to the source row's id
    lecture_id      TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    embedding_blob  BLOB NOT NULL,  -- float32 array, little-endian
    model           TEXT NOT NULL,
    created_at      INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_source
    ON embeddings(source_type, source_id);

-- ── Quiz Sessions (timed/practice mode) ──────────────────────
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id                  TEXT PRIMARY KEY,
    lecture_id          TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    mode                TEXT NOT NULL,  -- 'practice' | 'exam'
    time_limit_seconds  INTEGER,        -- NULL = no limit
    started_at          INTEGER NOT NULL,
    completed_at        INTEGER,
    score_pct           REAL,           -- 0.0–100.0, set on completion
    answers_json        TEXT            -- JSON array of {quiz_id, submitted_answer, is_correct}
);
