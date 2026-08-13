use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use crate::services::lecture_service::LectureService;

#[tauri::command]
pub async fn sync_meeting_to_markdown(
    lecture_id: String,
    state: State<'_, DbState>,
) -> AppResult<bool> {
    sync_meeting_to_markdown_internal(&lecture_id, &state.pool).await
}

pub async fn sync_meeting_to_markdown_internal(
    lecture_id: &str,
    pool: &sqlx::SqlitePool,
) -> AppResult<bool> {
    // 1. Check if auto export is enabled and path is valid
    let auto_export_row = sqlx::query("SELECT value FROM settings WHERE key = 'auto_export_markdown'")
        .fetch_optional(pool).await?;
    let auto_export = auto_export_row.map(|r| sqlx::Row::get::<String, _>(&r, "value") == "true").unwrap_or(false);

    if !auto_export {
        return Ok(false);
    }

    let export_path_row = sqlx::query("SELECT value FROM settings WHERE key = 'markdown_export_path'")
        .fetch_optional(pool).await?;
    let export_path_str = export_path_row.map(|r| sqlx::Row::get::<String, _>(&r, "value")).unwrap_or_default();

    if export_path_str.trim().is_empty() {
        return Ok(false);
    }

    let export_dir = PathBuf::from(&export_path_str);
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir).map_err(|e| AppError::Internal(format!("Failed to create export directory: {}", e)))?;
    }

    // 2. Fetch the lecture details
    let lecture_opt = LectureService::get_lecture(pool, &lecture_id).await?;
    let lecture = match lecture_opt {
        Some(l) => l,
        None => return Err(AppError::Internal("Lecture not found".to_string())),
    };

    // 3. Fetch Transcript, Summary, Notes
    let mut combined_transcript = String::new();
    let trans_rows = sqlx::query!("SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC", lecture_id)
        .fetch_all(pool).await?;
    for row in trans_rows {
        combined_transcript.push_str(&row.content);
        combined_transcript.push_str("\n\n");
    }

    let mut summary = String::new();
    let sum_row = sqlx::query!("SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1", lecture_id)
        .fetch_optional(pool).await?;
    if let Some(r) = sum_row {
        summary = r.content;
    }

    let mut notes = String::new();
    let note_row = sqlx::query!("SELECT content FROM notes WHERE lecture_id = ?", lecture_id)
        .fetch_optional(pool).await?;
    if let Some(r) = note_row {
        notes = r.content;
    }

    // Fetch action items
    let mut action_items = String::new();
    let artifact_rows = sqlx::query!("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'action_items'", lecture_id)
        .fetch_all(pool).await?;
    for row in artifact_rows {
        action_items.push_str(&format!("{}\n\n", row.content_json));
    }

    // Format Date
    let date_str = lecture.created_at.clone();
    let safe_title = lecture.title.replace("/", "-").replace("\\", "-").replace(":", "-");

    // 4. Construct the Markdown content (Obsidian / Frontmatter friendly)
    let mut md = String::new();
    
    // Frontmatter
    md.push_str("---\n");
    md.push_str(&format!("title: \"{}\"\n", lecture.title.replace("\"", "\\\"")));
    md.push_str(&format!("date: {}\n", date_str));
    md.push_str("tags: [meeting, bacham]\n");
    md.push_str("---\n\n");

    md.push_str(&format!("# {}\n\n", lecture.title));
    
    if !summary.is_empty() {
        md.push_str("## Summary\n\n");
        md.push_str(&summary);
        md.push_str("\n\n");
    }

    if !action_items.is_empty() {
        md.push_str("## Action Items\n\n");
        md.push_str(&action_items);
        md.push_str("\n\n");
    }

    if !notes.is_empty() {
        md.push_str("## Notes\n\n");
        md.push_str(&notes);
        md.push_str("\n\n");
    }

    if !combined_transcript.is_empty() {
        md.push_str("## Transcript\n\n");
        md.push_str(&combined_transcript);
        md.push_str("\n\n");
    }

    // 5. Write to File
    let filename = format!("{} - {}.md", lecture.created_at.split('T').next().unwrap_or(""), safe_title);
    let file_path = export_dir.join(&filename);

    fs::write(&file_path, md).map_err(|e| AppError::Internal(format!("Failed to write markdown file: {}", e)))?;

    Ok(true)
}
