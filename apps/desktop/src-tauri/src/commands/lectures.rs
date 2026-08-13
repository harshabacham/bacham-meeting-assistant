use std::process::Command;
use std::fs;
use std::path::PathBuf;
use serde::Deserialize;
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

#[derive(Deserialize)]
pub struct TrimSegment {
    pub start_ms: i64,
    pub end_ms: i64,
}

#[tauri::command]
pub async fn trim_video_by_timestamps(lecture_id: String, exclude_segments: Vec<TrimSegment>, state: State<'_, DbState>) -> AppResult<String> {
    let pool = &state.pool;
    let row = sqlx::query!("SELECT video_path, duration_ms FROM lectures WHERE id = ?", lecture_id)
        .fetch_optional(pool)
        .await?;

    if let Some(r) = row {
        if let Some(video_path) = r.video_path {
            let path = PathBuf::from(&video_path);
            if !path.exists() {
                return Err(crate::error::AppError::Internal("Video file not found".to_string()));
            }

            let duration = r.duration_ms; // fallback 1 hour
            
            // Build inclusion segments by inverting exclude_segments
            let mut includes = Vec::new();
            let mut current = 0;
            
            let mut sorted_excludes = exclude_segments;
            sorted_excludes.sort_by_key(|s| s.start_ms);
            
            for ex in &sorted_excludes {
                if ex.start_ms > current {
                    includes.push((current, ex.start_ms));
                }
                current = current.max(ex.end_ms);
            }
            if current < duration {
                includes.push((current, duration));
            }

            // Create concat text file
            let mut concat_content = String::new();
            for (start, end) in includes {
                concat_content.push_str(&format!("file '{}'\n", video_path.replace("\\", "/")));
                concat_content.push_str(&format!("inpoint {:.3}\n", start as f64 / 1000.0));
                concat_content.push_str(&format!("outpoint {:.3}\n", end as f64 / 1000.0));
            }
            
            let concat_path = path.with_extension("concat.txt");
            fs::write(&concat_path, concat_content).unwrap_or_default();

            let out_path = path.with_file_name(format!("{}_trimmed.webm", lecture_id));
            
            // Run FFmpeg
            let status = Command::new("ffmpeg")
                .arg("-y")
                .arg("-f").arg("concat")
                .arg("-safe").arg("0")
                .arg("-i").arg(&concat_path)
                .arg("-c").arg("copy")
                .arg(&out_path)
                .status();

            // Cleanup concat txt
            let _ = fs::remove_file(&concat_path);

            if let Ok(st) = status {
                if st.success() {
                    let out_path_str = out_path.to_string_lossy().to_string();
                    sqlx::query!("UPDATE lectures SET video_path = ? WHERE id = ?", out_path_str, lecture_id)
                        .execute(pool)
                        .await?;
                    
                    return Ok(out_path_str);
                }
            }
        }
    }
    Err(crate::error::AppError::Internal("Failed to trim video".to_string()))
}

#[tauri::command]
pub async fn delete_lecture_video(id: String, state: State<'_, DbState>) -> AppResult<()> {
    let pool = &state.pool;
    let row = sqlx::query!("SELECT video_path FROM lectures WHERE id = ?", id)
        .fetch_optional(pool)
        .await?;

    if let Some(r) = row {
        if let Some(video_path) = r.video_path {
            let path = PathBuf::from(&video_path);
            if path.exists() {
                let _ = fs::remove_file(&path);
            }
            let now = chrono::Utc::now().timestamp_millis();
            sqlx::query!("UPDATE lectures SET video_path = NULL, updated_at = ? WHERE id = ?", now, id)
                .execute(pool)
                .await?;
        }
    }
    Ok(())
}
