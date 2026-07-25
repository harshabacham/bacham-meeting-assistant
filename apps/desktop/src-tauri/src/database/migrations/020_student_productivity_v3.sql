-- Phase 4: Student Productivity & Time Saving Intelligence Tables

-- 1. Smart Lecture Skip Segments (Essential, Helpful, Optional)
CREATE TABLE IF NOT EXISTS lecture_skip_segments (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    segment_type TEXT NOT NULL, -- 'essential', 'helpful', 'optional'
    category TEXT NOT NULL,     -- 'concept', 'formula', 'code', 'diagram', 'exam', 'greetings', 'pause', 'recap'
    summary TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_skip_segments_lecture ON lecture_skip_segments(lecture_id);

-- 2. Automatic Smart Bookmarks (Professor emphasis, formulas, diagrams)
CREATE TABLE IF NOT EXISTS auto_bookmarks (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    screenshot_path TEXT,
    category TEXT NOT NULL, -- 'exam_warning', 'formula', 'diagram', 'definition', 'code'
    created_at INTEGER NOT NULL,
    FOREIGN KEY(lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_auto_bookmarks_lecture ON auto_bookmarks(lecture_id);

-- 3. Exam Question Predictions
CREATE TABLE IF NOT EXISTS exam_question_predictions (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    question TEXT NOT NULL,
    likelihood TEXT NOT NULL, -- 'very_likely', 'likely', 'possible'
    explanation TEXT NOT NULL,
    references_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_exam_predictions_lecture ON exam_question_predictions(lecture_id);

-- 4. Professor Insights
CREATE TABLE IF NOT EXISTS professor_insights (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    timestamp_ms INTEGER,
    insight_type TEXT NOT NULL, -- 'repeated_5x', 'slowed_down', 'emphasized_exam', 'self_corrected'
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_professor_insights_lecture ON professor_insights(lecture_id);
