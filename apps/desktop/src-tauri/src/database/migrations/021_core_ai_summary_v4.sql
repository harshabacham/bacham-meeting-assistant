-- Add summary_level to summaries table
ALTER TABLE summaries ADD COLUMN summary_level TEXT DEFAULT 'standard';

-- Create analysis_modules to track pipeline stages
CREATE TABLE IF NOT EXISTS analysis_modules (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    visual_done BOOLEAN DEFAULT 0,
    audio_done BOOLEAN DEFAULT 0,
    transcript_done BOOLEAN DEFAULT 0,
    ocr_done BOOLEAN DEFAULT 0,
    concept_extraction_done BOOLEAN DEFAULT 0,
    scene_segmentation_done BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create extracted_concepts for structured knowledge objects
CREATE TABLE IF NOT EXISTS extracted_concepts (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    concept_type TEXT NOT NULL, -- e.g., 'formula', 'code', 'diagram', 'exam_tip', 'common_mistake'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    structured_data TEXT, -- JSON holding variables, examples, complexity etc
    source_timestamp INTEGER, -- optional linked timestamp
    source_screenshot_id TEXT REFERENCES screenshots(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create lecture_chapters for semantic scene segmentation
CREATE TABLE IF NOT EXISTS lecture_chapters (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    start_timestamp INTEGER NOT NULL,
    end_timestamp INTEGER,
    importance TEXT DEFAULT 'normal', -- 'normal', 'high', 'exam_critical'
    difficulty TEXT DEFAULT 'medium',
    concepts_covered TEXT, -- JSON array of strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extracted_concepts_lecture ON extracted_concepts(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_chapters_lecture ON lecture_chapters(lecture_id);
