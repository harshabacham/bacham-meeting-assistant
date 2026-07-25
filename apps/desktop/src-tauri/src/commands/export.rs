use tauri::State;
use std::path::PathBuf;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::export_service::ExportService;

#[tauri::command]
pub async fn export_lecture(
    lecture_id: String,
    format: String,
    dest: String,
    state: State<'_, DbState>,
) -> AppResult<()> {
    let path = PathBuf::from(dest);
    match format.as_str() {
        "markdown" => ExportService::export_markdown(&state.pool, &lecture_id, &path).await?,
        "pdf" => ExportService::export_pdf(&state.pool, &lecture_id, &path).await?,
        "html" => ExportService::export_html(&state.pool, &lecture_id, &path).await?,
        "json" => ExportService::export_json(&state.pool, &lecture_id, &path).await?,
        _ => return Err(crate::error::AppError::Internal("Unsupported export format".into())),
    }
    Ok(())
}

#[tauri::command]
pub async fn export_folder_cram_sheet(
    folder_id: String,
    dest: String,
    state: State<'_, DbState>,
) -> AppResult<()> {
    let path = PathBuf::from(dest);
    ExportService::export_folder_cram_sheet(&state.pool, &folder_id, &path).await?;
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightSegment {
    pub start_ms: i64,
    pub end_ms: i64,
    pub label: String,
}

#[tauri::command]
pub async fn generate_highlights_reel(
    lecture_id: String,
    segments: Vec<HighlightSegment>,
    dest: String,
    state: State<'_, DbState>,
    _app: tauri::AppHandle,
) -> AppResult<()> {
    // Basic mock implementation for generating a highlight reel video.
    // In a full production environment, this would spawn an `ffmpeg` process
    // that uses a filter_complex to concat the segments from the original webm file.
    let path = PathBuf::from(dest);
    
    // First, find the original video file
    let _video_path_row = sqlx::query!(
        "SELECT video_path FROM lectures WHERE id = ?",
        lecture_id
    )
    .fetch_optional(&state.pool)
    .await?;

    // Verify there are segments
    if segments.is_empty() {
        return Err(crate::error::AppError::Internal("No segments provided for highlight reel".into()));
    }

    // Mock implementation: just write a placeholder file
    // Real implementation would build an ffmpeg command like:
    // ffmpeg -i input.webm -filter_complex "[0:v]trim=start=10:end=20,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=10:end=20,asetpts=PTS-STARTPTS[a0];..." -map "[v]" -map "[a]" output.webm
    
    let content = format!("BACHAM HIGHLIGHT REEL\nLecture: {}\nSegments: {} clips.\nThis is a mock video file representing the compiled highlights.", lecture_id, segments.len());
    
    if let Err(e) = std::fs::write(&path, content) {
        return Err(crate::error::AppError::Internal(format!("Failed to write highlight reel: {}", e)));
    }

    Ok(())
}
