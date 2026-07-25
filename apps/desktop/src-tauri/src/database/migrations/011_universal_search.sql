-- ============================================================
-- Migration 011 - Universal Search Phase 0 (Schema & Triggers)
-- ============================================================

-- 1. Core Unified Search Index (FTS5)
-- We use a standard FTS5 table because our content is heterogenous and spans 14+ tables,
-- which precludes the use of a single external content table.
CREATE VIRTUAL TABLE IF NOT EXISTS global_search_index USING fts5(
    entity_type UNINDEXED,      -- 'lecture' | 'transcript' | 'screenshot' | 'folder' | 'collection' | etc.
    entity_id UNINDEXED,        -- Source row UUID
    parent_lecture_id UNINDEXED,-- For zooming into a lecture from a sub-hit
    title,                      -- Entity name/title
    body,                       -- The searchable text
    metadata UNINDEXED,         -- JSON payload for filtering (tags, course, etc.)
    tokenize = 'unicode61 remove_diacritics 2'
);

-- 2. Meta Table for Fast Ranking & Filtering
CREATE TABLE IF NOT EXISTS search_index_meta (
    entity_type        TEXT NOT NULL,
    entity_id          TEXT NOT NULL,
    parent_lecture_id  TEXT,
    updated_at         TEXT NOT NULL,
    last_opened_at     TEXT,
    is_favorite        INTEGER NOT NULL DEFAULT 0,
    is_pinned          INTEGER NOT NULL DEFAULT 0,
    is_archived        INTEGER NOT NULL DEFAULT 0,
    popularity_score   REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_meta_parent ON search_index_meta(parent_lecture_id);

-- 3. Search History & Synonyms
CREATE TABLE IF NOT EXISTS search_history (
    id            TEXT PRIMARY KEY,
    query         TEXT NOT NULL,
    result_count  INTEGER NOT NULL,
    is_pinned     INTEGER NOT NULL DEFAULT 0,
    is_favorite   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_synonyms (
    term          TEXT NOT NULL,
    expands_to    TEXT NOT NULL,
    PRIMARY KEY (term)
);

-- Seed basic synonyms
INSERT OR IGNORE INTO search_synonyms (term, expands_to) VALUES 
('sorting', 'bubble sort, quick sort, merge sort, heap sort'),
('search', 'binary search, depth first, breadth first, DFS, BFS');

-- ============================================================
-- 4. Triggers (AFTER INSERT / UPDATE / DELETE) for all source tables
-- ============================================================

-- helper to get current time in ISO8601 for SQLite since some tables use INTEGER and some use DATETIME.
-- We will use datetime('now') for updated_at defaults where not provided.

-- ------------------------------------------------------------
-- 4.1 LECTURES
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_lectures_ai AFTER INSERT ON lectures BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body, metadata)
    VALUES ('lecture', new.id, NULL, new.title, new.course_label || ' ' || COALESCE(new.tags_flat, ''), json_object('course', new.course_label, 'teacher', new.teacher, 'semester', new.semester));
    
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, last_opened_at, is_favorite, is_pinned)
    VALUES ('lecture', new.id, NULL, coalesce(new.updated_at, datetime('now')), new.last_opened_at, coalesce(new.is_favorite, 0), coalesce(new.is_pinned, 0));
END;

CREATE TRIGGER IF NOT EXISTS search_lectures_au AFTER UPDATE ON lectures BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'lecture' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'lecture' AND entity_id = old.id;

    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body, metadata)
    VALUES ('lecture', new.id, NULL, new.title, new.course_label || ' ' || COALESCE(new.tags_flat, ''), json_object('course', new.course_label, 'teacher', new.teacher, 'semester', new.semester));
    
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, last_opened_at, is_favorite, is_pinned)
    VALUES ('lecture', new.id, NULL, coalesce(new.updated_at, datetime('now')), new.last_opened_at, coalesce(new.is_favorite, 0), coalesce(new.is_pinned, 0));
END;

CREATE TRIGGER IF NOT EXISTS search_lectures_ad AFTER DELETE ON lectures BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'lecture' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'lecture' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.2 FOLDERS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_folders_ai AFTER INSERT ON folders BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('folder', new.id, NULL, new.name, new.description);
    INSERT INTO search_index_meta(entity_type, entity_id, updated_at)
    VALUES ('folder', new.id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_folders_au AFTER UPDATE ON folders BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'folder' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'folder' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('folder', new.id, NULL, new.name, new.description);
    INSERT INTO search_index_meta(entity_type, entity_id, updated_at)
    VALUES ('folder', new.id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_folders_ad AFTER DELETE ON folders BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'folder' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'folder' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.3 COLLECTIONS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_collections_ai AFTER INSERT ON collections BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('collection', new.id, NULL, new.name, NULL);
    INSERT INTO search_index_meta(entity_type, entity_id, updated_at)
    VALUES ('collection', new.id, coalesce(new.updated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_collections_au AFTER UPDATE ON collections BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'collection' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'collection' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('collection', new.id, NULL, new.name, NULL);
    INSERT INTO search_index_meta(entity_type, entity_id, updated_at)
    VALUES ('collection', new.id, coalesce(new.updated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_collections_ad AFTER DELETE ON collections BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'collection' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'collection' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.4 TRANSCRIPTS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_transcripts_ai AFTER INSERT ON transcripts BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('transcript', new.id, new.lecture_id, NULL, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('transcript', new.id, new.lecture_id, coalesce(new.generated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_transcripts_au AFTER UPDATE ON transcripts BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'transcript' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'transcript' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('transcript', new.id, new.lecture_id, NULL, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('transcript', new.id, new.lecture_id, coalesce(new.generated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_transcripts_ad AFTER DELETE ON transcripts BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'transcript' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'transcript' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.5 SCREENSHOTS (OCR)
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_screenshots_ai AFTER INSERT ON screenshots BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('screenshot', new.id, new.lecture_id, NULL, new.ocr_text);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('screenshot', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_screenshots_au AFTER UPDATE ON screenshots BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'screenshot' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'screenshot' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('screenshot', new.id, new.lecture_id, NULL, new.ocr_text);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('screenshot', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_screenshots_ad AFTER DELETE ON screenshots BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'screenshot' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'screenshot' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.6 LECTURE ARTIFACTS
-- ------------------------------------------------------------
-- Instead of separate tables for notes/formulas, V2 unified them here.
CREATE TRIGGER IF NOT EXISTS search_artifacts_ai AFTER INSERT ON lecture_artifacts BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES (new.artifact_type, new.id, new.lecture_id, NULL, new.content_json);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES (new.artifact_type, new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_artifacts_au AFTER UPDATE ON lecture_artifacts BEGIN
    DELETE FROM global_search_index WHERE entity_type = old.artifact_type AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = old.artifact_type AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES (new.artifact_type, new.id, new.lecture_id, NULL, new.content_json);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES (new.artifact_type, new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_artifacts_ad AFTER DELETE ON lecture_artifacts BEGIN
    DELETE FROM global_search_index WHERE entity_type = old.artifact_type AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = old.artifact_type AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.7 NOTES (Older table but still used for user-written notes)
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('note', new.id, new.lecture_id, NULL, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('note', new.id, new.lecture_id, coalesce(new.updated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_notes_au AFTER UPDATE ON notes BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'note' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'note' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('note', new.id, new.lecture_id, NULL, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('note', new.id, new.lecture_id, coalesce(new.updated_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'note' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'note' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.8 FLASHCARDS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_flashcards_ai AFTER INSERT ON flashcards BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('flashcard', new.id, new.lecture_id, new.question, new.answer);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('flashcard', new.id, new.lecture_id, coalesce(new.created_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_flashcards_au AFTER UPDATE ON flashcards BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'flashcard' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'flashcard' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('flashcard', new.id, new.lecture_id, new.question, new.answer);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('flashcard', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_flashcards_ad AFTER DELETE ON flashcards BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'flashcard' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'flashcard' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.9 QUIZZES
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_quizzes_ai AFTER INSERT ON quizzes BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('quiz', new.id, new.lecture_id, new.question, new.options);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('quiz', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_quizzes_au AFTER UPDATE ON quizzes BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'quiz' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'quiz' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('quiz', new.id, new.lecture_id, new.question, new.options);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('quiz', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_quizzes_ad AFTER DELETE ON quizzes BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'quiz' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'quiz' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.10 TIMELINE EVENTS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_timeline_ai AFTER INSERT ON timeline_events BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('timeline_event', new.id, new.lecture_id, new.label, new.event_type);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('timeline_event', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_timeline_au AFTER UPDATE ON timeline_events BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'timeline_event' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'timeline_event' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('timeline_event', new.id, new.lecture_id, new.label, new.event_type);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('timeline_event', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_timeline_ad AFTER DELETE ON timeline_events BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'timeline_event' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'timeline_event' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.11 BOOKMARKS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_bookmarks_ai AFTER INSERT ON bookmarks BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('bookmark', new.id, new.lecture_id, new.label, new.note);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('bookmark', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_bookmarks_au AFTER UPDATE ON bookmarks BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'bookmark' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'bookmark' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('bookmark', new.id, new.lecture_id, new.label, new.note);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('bookmark', new.id, new.lecture_id, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS search_bookmarks_ad AFTER DELETE ON bookmarks BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'bookmark' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'bookmark' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.12 CONVERSATIONS
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_conversations_ai AFTER INSERT ON conversations BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('conversation', new.id, NULL, new.title, new.scope_type);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, is_favorite, is_pinned, is_archived)
    VALUES ('conversation', new.id, NULL, coalesce(new.updated_at, datetime('now')), coalesce(new.is_favorite, 0), coalesce(new.is_pinned, 0), coalesce(new.is_archived, 0));
END;

CREATE TRIGGER IF NOT EXISTS search_conversations_au AFTER UPDATE ON conversations BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'conversation' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'conversation' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('conversation', new.id, NULL, new.title, new.scope_type);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, is_favorite, is_pinned, is_archived)
    VALUES ('conversation', new.id, NULL, coalesce(new.updated_at, datetime('now')), coalesce(new.is_favorite, 0), coalesce(new.is_pinned, 0), coalesce(new.is_archived, 0));
END;

CREATE TRIGGER IF NOT EXISTS search_conversations_ad AFTER DELETE ON conversations BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'conversation' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'conversation' AND entity_id = old.id;
END;

-- ------------------------------------------------------------
-- 4.13 MESSAGES
-- ------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('message', new.id, NULL, new.role, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('message', new.id, NULL, coalesce(new.created_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_messages_au AFTER UPDATE ON messages BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'message' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'message' AND entity_id = old.id;
    
    INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
    VALUES ('message', new.id, NULL, new.role, new.content);
    INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
    VALUES ('message', new.id, NULL, coalesce(new.created_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS search_messages_ad AFTER DELETE ON messages BEGIN
    DELETE FROM global_search_index WHERE entity_type = 'message' AND entity_id = old.id;
    DELETE FROM search_index_meta WHERE entity_type = 'message' AND entity_id = old.id;
END;
