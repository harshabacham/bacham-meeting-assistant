use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;

#[derive(Serialize, Deserialize)]
pub struct BatchResult {
    pub succeeded: Vec<String>,
    pub failed: Vec<(String, String)>,
}

use sqlx::{QueryBuilder, Sqlite};

#[tauri::command]
pub async fn move_lectures(state: State<'_, DbState>, lecture_ids: Vec<String>, target_folder_id: Option<String>) -> AppResult<BatchResult> {
    if lecture_ids.is_empty() {
        return Ok(BatchResult { succeeded: vec![], failed: vec![] });
    }
    
    let mut tx = state.pool.begin().await?;
    
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE lectures SET folder_id = ");
    query_builder.push_bind(target_folder_id);
    query_builder.push(" WHERE id IN (");
    
    let mut separated = query_builder.separated(", ");
    for id in lecture_ids.iter() {
        separated.push_bind(id.clone());
    }
    separated.push_unseparated(")");
    
    query_builder.build().execute(&mut *tx).await?;
    tx.commit().await?;

    Ok(BatchResult {
        succeeded: lecture_ids,
        failed: vec![], // For now we assume all succeed since it's a bulk operation
    })
}

async fn update_lecture_flag(pool: &sqlx::SqlitePool, lecture_ids: &[String], flag_column: &str, flag_value: i32) -> AppResult<()> {
    if lecture_ids.is_empty() {
        return Ok(());
    }
    let mut tx = pool.begin().await?;
    
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(format!("UPDATE lectures SET {} = ", flag_column));
    query_builder.push_bind(flag_value);
    query_builder.push(" WHERE id IN (");
    
    let mut separated = query_builder.separated(", ");
    for id in lecture_ids.iter() {
        separated.push_bind(id.clone());
    }
    separated.push_unseparated(")");
    
    query_builder.build().execute(&mut *tx).await?;
    tx.commit().await?;

    Ok(())
}

#[tauri::command]
pub async fn set_favorite(state: State<'_, DbState>, lecture_ids: Vec<String>, favorite: bool) -> AppResult<()> {
    update_lecture_flag(&state.pool, &lecture_ids, "is_favorite", if favorite { 1 } else { 0 }).await
}

#[tauri::command]
pub async fn set_pinned(state: State<'_, DbState>, lecture_ids: Vec<String>, pinned: bool) -> AppResult<()> {
    update_lecture_flag(&state.pool, &lecture_ids, "is_pinned", if pinned { 1 } else { 0 }).await
}

#[tauri::command]
pub async fn set_archived(state: State<'_, DbState>, lecture_ids: Vec<String>, archived: bool) -> AppResult<()> {
    update_lecture_flag(&state.pool, &lecture_ids, "is_archived", if archived { 1 } else { 0 }).await
}


