use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::AppResult;

pub struct SummaryService;

impl SummaryService {
    pub async fn generate_summary(pool: &SqlitePool, lecture_id: &str, transcript: &str) -> AppResult<String> {
        let instruction = r#"Summarize the following lecture comprehensively. You may use the provided visual frames to understand the context.
You MUST return your response as a valid JSON array of objects. 
Each object must have exactly two fields:
- "section_title": A clear title for the section (e.g. "Executive Summary", "Key Concepts", "Formulas Discussed", "Problems Solved", "Conclusion").
- "content": The detailed markdown content for that section.
Do not wrap the JSON in ```json blocks, return the raw JSON array."#;
        
        let mut image_parts = Vec::new();
        let mut enriched_transcript = transcript.to_string();

        if let Ok(ctx) = crate::ai::context_builder::ContextBuilder::build(pool, lecture_id, true).await {
            if !ctx.key_frames.is_empty() {
                enriched_transcript.push_str("\n\n--- SLIDE TEXT (OCR) ---\n");
                for (i, frame) in ctx.key_frames.iter().enumerate() {
                    if let Some(ocr) = &frame.ocr_text {
                        if !ocr.trim().is_empty() {
                            enriched_transcript.push_str(&format!("Slide {}:\n{}\n\n", i + 1, ocr));
                        }
                    }
                    if let Some(b64) = &frame.image_base64 {
                        image_parts.push((b64.clone(), "image/png".to_string()));
                    }
                }
            }
        }

        let content = if image_parts.is_empty() {
            crate::services::universal_ai::UniversalAiService::generate_text(&enriched_transcript, instruction, pool).await?
        } else {
            crate::services::universal_ai::UniversalAiService::generate_multimodal(&enriched_transcript, instruction, &image_parts, pool).await?
        };
        
        let id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT OR REPLACE INTO summaries (id, lecture_id, content, model_used) VALUES (?, ?, ?, 'gemini-2.0-flash-lite')",
            id, lecture_id, content
        ).execute(pool).await?;
        
        Ok(content)
    }

    pub async fn get_summary(pool: &SqlitePool, lecture_id: &str) -> AppResult<Option<String>> {
        let row = sqlx::query!(
            "SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1",
            lecture_id
        ).fetch_optional(pool).await?;
        
        Ok(row.map(|r| r.content))
    }
}
