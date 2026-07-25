-- ============================================================
-- Migration 018 — BACHAM Multimodal AI Engine (Phase 1) Schema
-- ============================================================

-- Granular extracted knowledge objects (Concepts, Formulas, Code, Diagrams, Graphs, Questions, Examples, Analogies, Misconceptions)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id                 TEXT PRIMARY KEY,
    lecture_id         TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    node_type          TEXT NOT NULL,
    title              TEXT NOT NULL,
    start_ms           INTEGER,
    end_ms             INTEGER,
    ocr_text           TEXT,
    transcript_excerpt TEXT,
    screenshot_id      TEXT REFERENCES screenshots(id),
    confidence         TEXT NOT NULL DEFAULT 'high',
    metadata_json      TEXT,
    created_at         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knodes_lecture ON knowledge_nodes(lecture_id);
CREATE INDEX IF NOT EXISTS idx_knodes_type ON knowledge_nodes(node_type);

-- Structured Knowledge Graph relationships
CREATE TABLE IF NOT EXISTS knowledge_edges (
    id                 TEXT PRIMARY KEY,
    lecture_id         TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    from_node_id       TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    to_node_id         TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    relation           TEXT NOT NULL,
    weight             REAL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_kedges_lecture ON knowledge_edges(lecture_id);

-- Multimodal keyframe visual analysis (Diagram, Formula, Code, Graph, Flowchart, UI, Math/Physics domain)
CREATE TABLE IF NOT EXISTS visual_analyses (
    id                      TEXT PRIMARY KEY,
    screenshot_id           TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    lecture_id              TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    visual_type             TEXT NOT NULL,
    domain                  TEXT,
    description             TEXT NOT NULL,
    purpose                 TEXT,
    importance_score        REAL NOT NULL DEFAULT 0.5,
    structured_details_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_vanalyses_screenshot ON visual_analyses(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_vanalyses_lecture ON visual_analyses(lecture_id);

-- Cross-lecture relationships across subjects & semesters
CREATE TABLE IF NOT EXISTS cross_lecture_links (
    id                 TEXT PRIMARY KEY,
    source_lecture_id  TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    target_lecture_id  TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    source_node_id     TEXT REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    target_node_id     TEXT REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    link_type          TEXT NOT NULL,
    explanation        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinks_source ON cross_lecture_links(source_lecture_id);

-- Personal Learning & Mastery Model
CREATE TABLE IF NOT EXISTS user_knowledge_profile (
    topic_id           TEXT PRIMARY KEY,
    topic_name         TEXT NOT NULL,
    mastery_score      REAL NOT NULL DEFAULT 0.5,
    total_quizzes      INTEGER NOT NULL DEFAULT 0,
    correct_quizzes    INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at   INTEGER NOT NULL
);
