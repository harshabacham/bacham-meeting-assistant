use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use sqlx::Row;
use crate::error::AppResult;
use crate::database::DbState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub is_pinned: bool,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn get_workspace_notes(state: State<'_, DbState>) -> AppResult<Vec<WorkspaceNote>> {
    let pool = &state.pool;
    
    // Order by pinned first, then by updated_at descending
    let rows = sqlx::query(
        "SELECT id, title, content_html, is_pinned, tags_json, created_at, updated_at 
         FROM workspace_notes 
         ORDER BY is_pinned DESC, updated_at DESC"
    ).fetch_all(pool).await?;

    let notes = rows.into_iter().map(|r| {
        let tags_json: String = r.get("tags_json");
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        let created_at_str: String = r.get("created_at");
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(0);
        let updated_at_str: String = r.get("updated_at");
        let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(0);
        
        let is_pinned: bool = r.get::<i32, _>("is_pinned") != 0;

        WorkspaceNote {
            id: r.get("id"),
            title: r.get("title"),
            content: r.get("content_html"),
            is_pinned,
            tags,
            created_at,
            updated_at,
        }
    }).collect();

    Ok(notes)
}

#[tauri::command]
pub async fn create_workspace_note(
    state: State<'_, DbState>, 
    title: String, 
    content: String
) -> AppResult<WorkspaceNote> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tags_json = "[]".to_string();

    sqlx::query(
        "INSERT INTO workspace_notes (id, title, content_html, is_pinned, tags_json, created_at, updated_at) 
         VALUES (?, ?, ?, 0, ?, ?, ?)"
    )
    .bind(&id).bind(&title).bind(&content).bind(&tags_json).bind(&now).bind(&now)
    .execute(&state.pool).await?;

    Ok(WorkspaceNote {
        id,
        title,
        content,
        is_pinned: false,
        tags: vec![],
        created_at: Utc::now().timestamp_millis(),
        updated_at: Utc::now().timestamp_millis(),
    })
}

#[tauri::command]
pub async fn update_workspace_note(
    state: State<'_, DbState>, 
    id: String, 
    title: Option<String>, 
    content: Option<String>,
    is_pinned: Option<bool>,
    tags: Option<Vec<String>>
) -> AppResult<WorkspaceNote> {
    let now = Utc::now().to_rfc3339();
    let mut tx = state.pool.begin().await?;

    if let Some(t) = title {
        sqlx::query("UPDATE workspace_notes SET title = ?, updated_at = ? WHERE id = ?")
            .bind(t).bind(&now).bind(&id)
            .execute(&mut *tx).await?;
    }
    if let Some(c) = content {
        sqlx::query("UPDATE workspace_notes SET content_html = ?, updated_at = ? WHERE id = ?")
            .bind(c).bind(&now).bind(&id)
            .execute(&mut *tx).await?;
    }
    if let Some(p) = is_pinned {
        let p_int = if p { 1 } else { 0 };
        sqlx::query("UPDATE workspace_notes SET is_pinned = ?, updated_at = ? WHERE id = ?")
            .bind(p_int).bind(&now).bind(&id)
            .execute(&mut *tx).await?;
    }
    if let Some(t_vec) = tags {
        let t_json = serde_json::to_string(&t_vec).unwrap_or_else(|_| "[]".to_string());
        sqlx::query("UPDATE workspace_notes SET tags_json = ?, updated_at = ? WHERE id = ?")
            .bind(t_json).bind(&now).bind(&id)
            .execute(&mut *tx).await?;
    }

    tx.commit().await?;

    let row = sqlx::query(
        "SELECT id, title, content_html, is_pinned, tags_json, created_at, updated_at FROM workspace_notes WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.pool).await?;

    let tags_json: String = row.get("tags_json");
    let parsed_tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    
    let created_at_str: String = row.get("created_at");
    let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0);
        
    let updated_at_str: String = row.get("updated_at");
    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0);

    let is_pinned: bool = row.get::<i32, _>("is_pinned") != 0;

    Ok(WorkspaceNote {
        id: row.get("id"),
        title: row.get("title"),
        content: row.get("content_html"),
        is_pinned,
        tags: parsed_tags,
        created_at,
        updated_at,
    })
}

#[tauri::command]
pub async fn delete_workspace_note(state: State<'_, DbState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM workspace_notes WHERE id = ?")
        .bind(id)
        .execute(&state.pool).await?;
    Ok(())
}
