CREATE TABLE IF NOT EXISTS ai_cache (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL UNIQUE,
  response_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_cache(request_hash);
