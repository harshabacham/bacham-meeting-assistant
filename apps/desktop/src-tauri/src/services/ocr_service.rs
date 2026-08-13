use sqlx::SqlitePool;
use std::path::PathBuf;
use crate::error::AppResult;

pub struct OCRService;

impl OCRService {
    pub async fn process_image(pool: &SqlitePool, lecture_id: &str, image_path: &PathBuf) -> AppResult<()> {
        let path_str = image_path.to_string_lossy().to_string();
        
        sqlx::query!("UPDATE screenshots SET ocr_status = 'processing' WHERE file_path = ?", path_str)
            .execute(pool).await?;

        // 1. Generate Semantic Visual Caption AND Extract OCR via Gemini
        let mut combined_text = String::new();
        if let Ok(bytes) = std::fs::read(image_path) {
            use base64::{Engine as _, engine::general_purpose::STANDARD};
            let b64 = STANDARD.encode(&bytes);
            let mime_type = if path_str.to_lowercase().ends_with(".png") { "image/png" } else { "image/jpeg" };
            
            let prompt = r#"You are an expert OCR and visual analysis AI.
1. Extract all readable text from this screenshot exactly as it appears.
2. Provide a highly detailed visual description of the layout, diagrams, charts, and people.

Format strictly as:
[Extracted Text]
<text>
[Visual Description]
<description>"#;
            
            let sys = "You are a multimodal semantic indexer. Follow the formatting strictly.";
            
            if let Ok(result_text) = crate::services::universal_ai::UniversalAiService::generate_multimodal(
                prompt,
                sys,
                &[(mime_type.to_string(), b64)],
                pool
            ).await {
                combined_text = result_text;
            }
        }
            
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
