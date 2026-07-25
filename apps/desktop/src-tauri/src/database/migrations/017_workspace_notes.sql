CREATE TABLE IF NOT EXISTS workspace_notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT 0,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
