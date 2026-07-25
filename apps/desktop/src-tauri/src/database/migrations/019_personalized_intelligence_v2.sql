-- ============================================================
-- Migration 019 — BACHAM Phase 2: Personalized Learning Intelligence
-- ============================================================

-- Exact Study Session Memory per lecture (Restores workspace state on return)
CREATE TABLE IF NOT EXISTS study_sessions (
    lecture_id            TEXT PRIMARY KEY REFERENCES lectures(id) ON DELETE CASCADE,
    video_timestamp_ms    INTEGER NOT NULL DEFAULT 0,
    active_tab            TEXT NOT NULL DEFAULT 'transcript',
    scroll_position       INTEGER NOT NULL DEFAULT 0,
    open_note_id          TEXT,
    workspace_layout_json TEXT,
    updated_at            INTEGER NOT NULL
);

-- Hybrid Spaced Repetition Scheduler (SM-2 + AI Confidence)
CREATE TABLE IF NOT EXISTS spaced_repetition_schedule (
    id                TEXT PRIMARY KEY,
    item_type         TEXT NOT NULL, -- 'lecture' | 'concept' | 'flashcard' | 'quiz'
    item_id           TEXT NOT NULL,
    lecture_id        TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    next_review_at    INTEGER NOT NULL,
    interval_days     INTEGER NOT NULL DEFAULT 1,
    ease_factor       REAL NOT NULL DEFAULT 2.5,
    repetition_count  INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_srs_next_review ON spaced_repetition_schedule(next_review_at);
CREATE INDEX IF NOT EXISTS idx_srs_lecture ON spaced_repetition_schedule(lecture_id);

-- Silent Learning Behavior Event Log
CREATE TABLE IF NOT EXISTS learning_events (
    id            TEXT PRIMARY KEY,
    lecture_id    TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    event_type    TEXT NOT NULL, -- 'lecture_open' | 'video_seek' | 'quiz_submit' | 'ai_question' | 'bookmark_add' | 'note_edit' | 'flashcard_review'
    duration_ms   INTEGER DEFAULT 0,
    metadata_json TEXT,
    created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_levents_created ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_levents_lecture ON learning_events(lecture_id);

-- Learned AI Explanation Preferences
CREATE TABLE IF NOT EXISTS ai_explanation_preferences (
    id               TEXT PRIMARY KEY,
    preferred_style  TEXT NOT NULL DEFAULT 'general',
    confidence_boost REAL NOT NULL DEFAULT 1.0,
    adapted_count    INTEGER NOT NULL DEFAULT 0,
    updated_at       INTEGER NOT NULL
);

-- Daily Study Activity & Streaks
CREATE TABLE IF NOT EXISTS study_streaks (
    id               TEXT PRIMARY KEY,
    date_str         TEXT NOT NULL UNIQUE,
    duration_ms      INTEGER NOT NULL DEFAULT 0,
    activities_count INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL
);
