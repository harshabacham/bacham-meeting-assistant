use sqlx::SqlitePool;
use std::path::PathBuf;
use crate::error::{AppResult, AppError};

pub struct OCRService;

impl OCRService {
    pub async fn process_image(pool: &SqlitePool, lecture_id: &str, image_path: &PathBuf) -> AppResult<()> {
        use rusty_tesseract::{Args, Image};
        
        let path_str = image_path.to_string_lossy().to_string();
        
        sqlx::query!("UPDATE screenshots SET ocr_status = 'processing' WHERE file_path = ?", path_str)
            .execute(pool).await?;

        let img = Image::from_path(&path_str).map_err(|e| AppError::Internal(e.to_string()))?;
        let default_args = Args::default();
        
        // In a real app use tokio::task::spawn_blocking
        let ocr_text = rusty_tesseract::image_to_string(&img, &default_args)
            .unwrap_or_else(|_| "OCR Failed".to_string());
            
        sqlx::query!(
            "UPDATE screenshots SET ocr_status = 'done', ocr_text = ? WHERE file_path = ?",
            ocr_text, path_str
        ).execute(pool).await?;

        sqlx::query!(
            "INSERT INTO search_index (lecture_id, content, source_type) VALUES (?, ?, 'ocr')",
            lecture_id, ocr_text
        ).execute(pool).await?;

        Ok(())
    }
}
