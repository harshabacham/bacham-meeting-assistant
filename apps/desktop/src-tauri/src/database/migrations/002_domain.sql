CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS lectures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    course_label TEXT,
    folder_id TEXT REFERENCES folders(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER NOT NULL,
    source TEXT DEFAULT 'extension',
    is_favorite BOOLEAN DEFAULT 0,
    is_pinned BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS lecture_tags (
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lecture_id, tag_id)
);

CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_used TEXT
);

CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_used TEXT
);

CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    ocr_status TEXT DEFAULT 'pending',
    ocr_text TEXT,
    ocr_structured_json TEXT
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    timestamp_ms INTEGER NOT NULL,
    label TEXT,
    note TEXT
);

CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at DATETIME
);

CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    options TEXT
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    lecture_id UNINDEXED,
    content,
    source_type UNINDEXED
);
