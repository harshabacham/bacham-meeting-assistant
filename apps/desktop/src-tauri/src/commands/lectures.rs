use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::lecture_service::{Lecture, LectureService, UpdateLectureInput};

#[tauri::command]
pub async fn lectures_list(filter_json: Option<String>, state: State<'_, DbState>) -> AppResult<Vec<Lecture>> {
    LectureService::search_lectures(&state.pool, filter_json).await
}

#[tauri::command]
pub async fn lectures_get(id: String, state: State<'_, DbState>) -> AppResult<Option<Lecture>> {
    LectureService::get_lecture(&state.pool, &id).await
}

#[tauri::command]
pub async fn lectures_update(input: UpdateLectureInput, state: State<'_, DbState>) -> AppResult<()> {
    LectureService::update_lecture(&state.pool, input).await
}

/// Soft-delete (batch). Moved lectures to Trash — no rows removed.
#[tauri::command]
pub async fn lectures_delete(ids: Vec<String>, state: State<'_, DbState>) -> AppResult<()> {
    LectureService::soft_delete_lectures(&state.pool, &ids).await
}

/// List trashed lectures (deleted_at IS NOT NULL).
#[tauri::command]
pub async fn lectures_list_trash(state: State<'_, DbState>) -> AppResult<Vec<Lecture>> {
    LectureService::list_trashed(&state.pool).await
}

/// Restore lectures from trash (batch).
#[tauri::command]
pub async fn lectures_restore(ids: Vec<String>, state: State<'_, DbState>) -> AppResult<()> {
    LectureService::restore_lectures(&state.pool, &ids).await
}

/// Hard-delete ALL trashed lectures. Requires explicit user action (empty trash).
#[tauri::command]
pub async fn lectures_empty_trash(state: State<'_, DbState>) -> AppResult<usize> {
    LectureService::permanently_delete_trashed(&state.pool).await
}

/// Hard-delete specific lectures.
#[tauri::command]
pub async fn lectures_hard_delete(ids: Vec<String>, state: State<'_, DbState>) -> AppResult<usize> {
    LectureService::permanently_delete_lectures(&state.pool, &ids).await
}

/// Merge secondary lecture into primary. Secondary is soft-deleted after merge.
#[tauri::command]
pub async fn lectures_merge(
    primary_id: String,
    secondary_id: String,
    state: State<'_, DbState>,
) -> AppResult<String> {
    LectureService::merge_lectures(&state.pool, &primary_id, &secondary_id).await?;
    Ok(primary_id)
}

/// Duplicate a lecture (copies row + transcript + notes, not artifacts).
#[tauri::command]
pub async fn lectures_duplicate(id: String, state: State<'_, DbState>) -> AppResult<String> {
    LectureService::duplicate_lecture(&state.pool, &id).await
}

#[derive(serde::Serialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn tags_list(state: State<'_, DbState>) -> AppResult<Vec<Tag>> {
    let rows = sqlx::query!("SELECT id, name FROM tags ORDER BY name ASC")
        .fetch_all(&state.pool).await?;
    let tags = rows.into_iter().map(|r| Tag { id: r.id.unwrap_or_default(), name: r.name }).collect();
    Ok(tags)
}

#[tauri::command]
pub async fn lecture_add_tag(lecture_id: String, tag_name: String, state: State<'_, DbState>) -> AppResult<()> {
    let mut tx = state.pool.begin().await?;
    
    // Check if tag exists
    let existing = sqlx::query!("SELECT id FROM tags WHERE name = ?", tag_name)
        .fetch_optional(&mut *tx).await?;
        
    let tag_id = match existing {
        Some(row) => row.id.unwrap_or_default(),
        None => {
            let new_id = uuid::Uuid::new_v4().to_string();
            sqlx::query!("INSERT INTO tags (id, name) VALUES (?, ?)", new_id, tag_name)
                .execute(&mut *tx).await?;
            new_id
        }
    };
    
    sqlx::query!("INSERT OR IGNORE INTO lecture_tags (lecture_id, tag_id) VALUES (?, ?)", lecture_id, tag_id)
        .execute(&mut *tx).await?;
        
    tx.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn lecture_remove_tag(lecture_id: String, tag_name: String, state: State<'_, DbState>) -> AppResult<()> {
    let tag_opt = sqlx::query!("SELECT id FROM tags WHERE name = ?", tag_name)
        .fetch_optional(&state.pool).await?;
        
    if let Some(row) = tag_opt {
        sqlx::query!("DELETE FROM lecture_tags WHERE lecture_id = ? AND tag_id = ?", lecture_id, row.id)
            .execute(&state.pool).await?;
    }
    Ok(())
}
