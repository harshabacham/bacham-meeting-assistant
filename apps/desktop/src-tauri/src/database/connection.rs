use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::path::PathBuf;
use std::str::FromStr;
use crate::error::AppResult;

pub async fn create_pool(db_path: PathBuf) -> AppResult<SqlitePool> {
    if let Some(parent) = db_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    let db_url = format!("sqlite://{}", db_path.to_string_lossy());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(5));

    let pool = SqlitePool::connect_with(options).await?;

    // Run migrations located in src/database/migrations
    sqlx::migrate!("./src/database/migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}

// trigger rebuild
// trigger rebuild after fixing migrations
