CREATE TABLE IF NOT EXISTS ai_jobs (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at DATETIME,
  last_error TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_lecture_id ON ai_jobs(lecture_id);
