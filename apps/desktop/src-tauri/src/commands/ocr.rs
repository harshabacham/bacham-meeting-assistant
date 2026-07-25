use tauri::State;
use std::path::PathBuf;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::ocr_service::OCRService;

#[tauri::command]
pub async fn ocr_enqueue(lecture_id: String, image_path: String, state: State<'_, DbState>) -> AppResult<()> {
    let path = PathBuf::from(image_path);
    let pool = state.pool.clone();
    
    tauri::async_runtime::spawn(async move {
        let _ = OCRService::process_image(&pool, &lecture_id, &path).await;
    });
    
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrStatus {
    pub pending: i64,
    pub total: i64,
}

#[tauri::command]
pub async fn ocr_status(lecture_id: String, state: State<'_, DbState>) -> AppResult<OcrStatus> {
    let total_row = sqlx::query!("SELECT COUNT(*) as c FROM screenshots WHERE lecture_id = ?", lecture_id).fetch_one(&state.pool).await?;
    let pending_row = sqlx::query!("SELECT COUNT(*) as c FROM screenshots WHERE lecture_id = ? AND ocr_status IN ('pending', 'processing')", lecture_id).fetch_one(&state.pool).await?;
    
    Ok(OcrStatus {
        total: total_row.c as i64,
        pending: pending_row.c as i64,
    })
}
