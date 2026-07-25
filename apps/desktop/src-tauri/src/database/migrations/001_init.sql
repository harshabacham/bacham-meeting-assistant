-- Initial infrastructure schema
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Note: schema_migrations is automatically created by sqlx
