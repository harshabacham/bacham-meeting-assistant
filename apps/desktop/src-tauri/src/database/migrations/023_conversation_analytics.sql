CREATE TABLE IF NOT EXISTS conversation_analytics (
  id TEXT PRIMARY KEY,
  lecture_id TEXT UNIQUE NOT NULL,
  speaker_stats TEXT NOT NULL DEFAULT '[]',
  sentiment_timeline TEXT NOT NULL DEFAULT '[]',
  filler_words TEXT NOT NULL DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0,
  top_topics TEXT NOT NULL DEFAULT '[]',
  meeting_effectiveness TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);
