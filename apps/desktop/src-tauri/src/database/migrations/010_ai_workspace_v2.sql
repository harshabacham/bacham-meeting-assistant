-- ============================================================
-- Migration 010 — AI Workspace 2.0 Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    scope_type        TEXT NOT NULL,   -- 'lecture' | 'multi_lecture' | 'folder' | 'subject' | 'semester' | 'library'
    scope_ref_json    TEXT NOT NULL,   -- lecture_ids[] / folder_id / subject / semester, etc.
    is_pinned         INTEGER NOT NULL DEFAULT 0,
    is_favorite       INTEGER NOT NULL DEFAULT 0,
    is_archived       INTEGER NOT NULL DEFAULT 0,
    provider          TEXT NOT NULL,   -- 'gemini' | future providers
    model             TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

-- Snapshot of what was actually sent to the model, for debugging/caching/re-use
CREATE TABLE IF NOT EXISTS context_bundles (
    id                TEXT PRIMARY KEY,
    scope_hash        TEXT NOT NULL,
    query_hash        TEXT NOT NULL,
    assembled_context TEXT NOT NULL,
    truncated         INTEGER NOT NULL DEFAULT 0,
    lecture_ids_json  TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    expires_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id                TEXT PRIMARY KEY,
    conversation_id   TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role              TEXT NOT NULL,   -- 'user' | 'assistant' | 'system'
    content           TEXT NOT NULL,
    context_bundle_id TEXT REFERENCES context_bundles(id),
    token_usage_json  TEXT,
    created_at        TEXT NOT NULL
);

-- Every retrieved reference for a given assistant message — powers the References UI
CREATE TABLE IF NOT EXISTS message_references (
    id                TEXT PRIMARY KEY,
    message_id        TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    lecture_id        TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER,          -- nullable, for timeline-linked refs
    ref_type          TEXT NOT NULL,    -- 'transcript' | 'ocr' | 'formula' | 'code' | 'screenshot' | 'note'
    excerpt           TEXT,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS saved_prompts (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    body              TEXT NOT NULL,
    category          TEXT,             -- 'study' | 'programming' | 'math' | 'research' | 'revision' | 'writing' | 'productivity' | 'general'
    is_favorite       INTEGER NOT NULL DEFAULT 0,
    is_builtin        INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_action_runs (
    id                TEXT PRIMARY KEY,
    action_type       TEXT NOT NULL,    -- 'summary' | 'cheat_sheet' | 'flashcards' | 'quiz' | 'formula_sheet' | ...
    scope_type        TEXT NOT NULL,
    scope_ref_json    TEXT NOT NULL,
    result_ref        TEXT,             -- pointer to generated artifact (existing flashcards/quiz tables, or new content row)
    status            TEXT NOT NULL,    -- 'pending' | 'running' | 'done' | 'failed'
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_configs (
    id                TEXT PRIMARY KEY,
    provider          TEXT NOT NULL UNIQUE,  -- 'gemini' | 'openrouter' | 'claude' | 'openai' | 'ollama' | 'lmstudio' | 'azure_openai'
    enabled           INTEGER NOT NULL DEFAULT 0,
    encrypted_api_key TEXT,             -- via OS keychain reference or encrypted blob, never plaintext
    default_model     TEXT,
    config_json       TEXT
);
