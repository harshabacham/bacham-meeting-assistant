pub mod connection;

use sqlx::SqlitePool;

#[derive(Clone)]
pub struct DbState {
    pub pool: SqlitePool,
}
