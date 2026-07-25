use tauri::State;
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use crate::commands::folder_stats::FolderNote;
use uuid::Uuid;
use chrono::Utc;

#[tauri::command]
pub async fn get_folder_notes(state: State<'_, DbState>, folder_id: String) -> AppResult<Vec<FolderNote>> {
    let notes = sqlx::query!(
        "SELECT id, folder_id, title, body_md, kind, created_at, updated_at 
         FROM folder_notes WHERE folder_id = ? ORDER BY created_at DESC", 
        folder_id
    ).fetch_all(&state.pool).await?;

    Ok(notes.into_iter().map(|n| FolderNote {
        id: n.id.unwrap_or_default(),
        folder_id: n.folder_id,
        title: n.title,
        body_md: n.body_md,
        kind: n.kind,
        created_at: n.created_at,
        updated_at: n.updated_at,
    }).collect())
}

#[tauri::command]
pub async fn create_folder_note(
    state: State<'_, DbState>, 
    folder_id: String, 
    kind: String, 
    title: String
) -> AppResult<FolderNote> {
    let mut tx = state.pool.begin().await?;

    // Validation: only one scratchpad or study_guide per folder
    if kind == "scratchpad" || kind == "study_guide" {
        let existing = sqlx::query!(
            "SELECT id FROM folder_notes WHERE folder_id = ? AND kind = ?",
            folder_id, kind
        ).fetch_optional(&mut *tx).await?;

        if existing.is_some() {
            return Err(AppError::Internal(format!("Folder already has a note of kind '{}'", kind)));
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let body_md = "";

    sqlx::query!(
        "INSERT INTO folder_notes (id, folder_id, title, body_md, kind, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        id, folder_id, title, body_md, kind, now, now
    ).execute(&mut *tx).await?;

    tx.commit().await?;

    Ok(FolderNote {
        id,
        folder_id,
        title: Some(title),
        body_md: body_md.to_string(),
        kind,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_folder_note(
    state: State<'_, DbState>, 
    id: String, 
    title: Option<String>, 
    body_md: Option<String>
) -> AppResult<FolderNote> {
    let now = Utc::now().to_rfc3339();
    let mut tx = state.pool.begin().await?;

    if let Some(t) = title {
        sqlx::query!("UPDATE folder_notes SET title = ?, updated_at = ? WHERE id = ?", t, now, id)
            .execute(&mut *tx).await?;
    }
    if let Some(b) = body_md {
        sqlx::query!("UPDATE folder_notes SET body_md = ?, updated_at = ? WHERE id = ?", b, now, id)
            .execute(&mut *tx).await?;
    }

    tx.commit().await?;

    let row = sqlx::query!("SELECT * FROM folder_notes WHERE id = ?", id)
        .fetch_one(&state.pool).await?;

    Ok(FolderNote {
        id: row.id.unwrap_or_default(),
        folder_id: row.folder_id,
        title: row.title,
        body_md: row.body_md,
        kind: row.kind,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[tauri::command]
pub async fn delete_folder_note(state: State<'_, DbState>, id: String) -> AppResult<()> {
    sqlx::query!("DELETE FROM folder_notes WHERE id = ?", id).execute(&state.pool).await?;
    Ok(())
}
