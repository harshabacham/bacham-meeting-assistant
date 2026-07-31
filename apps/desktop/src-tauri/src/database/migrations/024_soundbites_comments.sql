CREATE TABLE IF NOT EXISTS soundbites (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  transcript_excerpt TEXT DEFAULT '',
  color TEXT DEFAULT 'indigo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transcript_comments (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  block_index INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'You',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
