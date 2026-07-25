use tauri::AppHandle;
use crate::error::AppResult;
use crate::ai::context_engine::ChatScope;
use crate::services::pattern_service::{PatternService, PatternResult, ComparisonResult};

#[tauri::command]
pub async fn detect_patterns(
    app: AppHandle,
    scope: ChatScope,
) -> AppResult<PatternResult> {
    PatternService::detect_patterns(&app, scope).await
}

#[tauri::command]
pub async fn compare_lectures(
    app: AppHandle,
    lecture_ids: Vec<String>,
) -> AppResult<ComparisonResult> {
    PatternService::compare_lectures(&app, lecture_ids).await
}
