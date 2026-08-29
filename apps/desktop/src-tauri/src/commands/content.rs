use tauri::State;
use serde::Serialize;
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use uuid::Uuid;
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Screenshot {
    pub id: String,
    pub file_path: String,
    pub captured_at: i64,
    pub is_key_frame: bool,
    pub change_reason: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteVersion {
    pub id: String,
    pub content: String,
    pub saved_at: i64,
}

#[tauri::command]
pub async fn transcript_get(lecture_id: String, state: State<'_, DbState>) -> AppResult<Option<String>> {
    let rows = sqlx::query!("SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC", lecture_id)
        .fetch_all(&state.pool)
        .await?;
        
    if rows.is_empty() {
        return Ok(None);
    }
    
    let combined = rows.into_iter()
        .map(|r| r.content)
        .collect::<Vec<_>>()
        .join("\n\n");
        
    Ok(Some(combined))
}

#[tauri::command]
pub async fn transcript_append(lecture_id: String, text: String, state: State<'_, DbState>) -> AppResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let _ = sqlx::query!(
        "INSERT INTO lectures (id, title, duration_ms, source, created_at, updated_at) VALUES (?, 'Desktop Recording', 0, 'desktop', ?, ?)
         ON CONFLICT(id) DO NOTHING",
        lecture_id, now, now
    ).execute(&state.pool).await;

    let transcript_id = uuid::Uuid::new_v4().to_string();
    sqlx::query!(
        "INSERT INTO transcripts (id, lecture_id, content, model_used) VALUES (?, ?, ?, 'desktop_capture')",
        transcript_id, lecture_id, text
    ).execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn notes_get(lecture_id: String, state: State<'_, DbState>) -> AppResult<Option<String>> {
    let row = sqlx::query!("SELECT content FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(&state.pool).await?;
    Ok(row.map(|r| r.content))
}

/// Update notes and snapshot a version (debounce is handled on the frontend).
#[tauri::command]
pub async fn notes_update(lecture_id: String, content: String, state: State<'_, DbState>) -> AppResult<()> {
    let now_str = chrono::Utc::now().to_rfc3339();
    let _ = sqlx::query!(
        "INSERT INTO lectures (id, title, duration_ms, source, created_at, updated_at) VALUES (?, 'Desktop Recording', 0, 'desktop', ?, ?)
         ON CONFLICT(id) DO NOTHING",
        lecture_id, now_str, now_str
    ).execute(&state.pool).await;

    // Check if a note already exists for this lecture
    let existing_note = sqlx::query!("SELECT id FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(&state.pool).await?;

    let _note_id = if let Some(row) = existing_note {
        // Update existing note
        sqlx::query!(
            "UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            content, row.id
        ).execute(&state.pool).await?;
        row.id
    } else {
        // Insert new note
        let id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO notes (id, lecture_id, content) VALUES (?, ?, ?)",
            id, lecture_id, content
        ).execute(&state.pool).await?;
        Some(id)
    };

    // Snapshot the version
    let note_id = sqlx::query!("SELECT id FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(&state.pool).await?
        .map(|r| r.id);

    if let Some(nid) = note_id {
        let version_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let _ = sqlx::query!(
            "INSERT INTO note_versions (id, note_id, content, saved_at) VALUES (?, ?, ?, ?)",
            version_id, nid, content, now
        ).execute(&state.pool).await;
    }

    Ok(())
}

/// List note version history for a lecture.
#[tauri::command]
pub async fn note_versions_list(lecture_id: String, state: State<'_, DbState>) -> AppResult<Vec<NoteVersion>> {
    let note_row = sqlx::query!("SELECT id FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(&state.pool).await?;

    let Some(note) = note_row else { return Ok(vec![]); };

    let rows = sqlx::query!(
        "SELECT id, content, saved_at FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC LIMIT 50",
        note.id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(rows.into_iter().map(|r| NoteVersion {
        id: r.id.unwrap_or_default(),
        content: r.content,
        saved_at: r.saved_at,
    }).collect())
}

/// Restore a previous note version (replaces current content).
#[tauri::command]
pub async fn note_versions_restore(version_id: String, lecture_id: String, state: State<'_, DbState>) -> AppResult<()> {
    let version = sqlx::query!("SELECT content FROM note_versions WHERE id = ?", version_id)
        .fetch_optional(&state.pool).await?
        .ok_or_else(|| AppError::Internal("Version not found".into()))?;

    sqlx::query!(
        "UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE lecture_id = ?",
        version.content, lecture_id
    )
    .execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn screenshots_get(lecture_id: String, state: State<'_, DbState>) -> AppResult<Vec<Screenshot>> {
    let rows = sqlx::query!(
        "SELECT id, file_path, captured_at, is_key_frame, change_reason \
         FROM screenshots WHERE lecture_id = ? ORDER BY captured_at ASC",
        lecture_id
    ).fetch_all(&state.pool).await?;
    Ok(rows.into_iter().map(|r| Screenshot {
        id: r.id.unwrap_or_default(),
        file_path: r.file_path,
        captured_at: r.captured_at,
        is_key_frame: r.is_key_frame.map(|v| v != 0).unwrap_or(false),
        change_reason: r.change_reason,
    }).collect())
}

#[tauri::command]
pub async fn summary_get(lecture_id: String, state: State<'_, DbState>) -> AppResult<Option<String>> {
    let row = sqlx::query!("SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(&state.pool).await?;
    Ok(row.map(|r| r.content))
}

#[tauri::command]
pub async fn read_file_as_base64(path: String) -> AppResult<String> {
    use crate::error::AppError;
    let bytes = tokio::fs::read(&path).await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(STANDARD.encode(&bytes))
}
