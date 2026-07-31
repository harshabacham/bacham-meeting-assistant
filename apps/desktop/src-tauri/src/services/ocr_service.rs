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
        
        // 1. Run local OCR
        let raw_ocr_text = rusty_tesseract::image_to_string(&img, &default_args)
            .unwrap_or_else(|_| "".to_string());
            
        // 2. Generate Semantic Visual Caption via Gemini
        let mut visual_caption = String::new();
        if let Ok(bytes) = std::fs::read(image_path) {
            use base64::{Engine as _, engine::general_purpose::STANDARD};
            let b64 = STANDARD.encode(&bytes);
            let mime_type = if path_str.to_lowercase().ends_with(".png") { "image/png" } else { "image/jpeg" };
            
            let prompt = "Provide a highly detailed visual description of this screenshot. Describe any diagrams, charts, text, or speakers. Do not include introductory text.";
            let sys = "You are a visual semantic indexer. Output raw descriptive text only.";
            
            if let Ok(caption) = crate::services::gemini_service::GeminiService::generate_multimodal(
                prompt,
                sys,
                &[(mime_type.to_string(), b64)],
                pool
            ).await {
                visual_caption = caption;
            }
        }
        
        let combined_text = format!("{}\n\n[Visual Description]\n{}", raw_ocr_text, visual_caption);
            
        sqlx::query!(
            "UPDATE screenshots SET ocr_status = 'done', ocr_text = ? WHERE file_path = ?",
            combined_text, path_str
        ).execute(pool).await?;

        sqlx::query!(
            "INSERT INTO search_index (lecture_id, content, source_type) VALUES (?, ?, 'ocr')",
            lecture_id, combined_text
        ).execute(pool).await?;

        Ok(())
    }
}
