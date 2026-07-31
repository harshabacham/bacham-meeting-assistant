use sqlx::SqlitePool;
use crate::error::AppResult;
use uuid::Uuid;
use crate::services::gemini_service::GeminiService;
use crate::ai::context_builder::ContextBuilder;

pub async fn generate_multi_level_summary(lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
    // 1. Fetch transcript and keyframes
    let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
    
    let mut enriched_transcript = String::new();
    let mut image_parts = Vec::new();

    if !ctx.transcript_segments.is_empty() {
        for segment in &ctx.transcript_segments {
            enriched_transcript.push_str(&segment.content);
            enriched_transcript.push_str("\n\n");
        }
    } else {
        enriched_transcript.push_str("No transcript available.");
    }

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

    // Fetch workspace_type
    let workspace_type: String = sqlx::query_scalar!(
        "SELECT workspace_type FROM lectures WHERE id = ?",
        lecture_id
    )
    .fetch_optional(pool)
    .await?
    .flatten()
    .unwrap_or_else(|| "lecture".to_string());

    // 2. Build massive unified prompt for 4-tier summary based on workspace_type
    let instruction = if workspace_type == "meeting" {
        r#"You are an expert AI meeting assistant.
Your task is to understand the meeting comprehensively from the transcript and visuals.
Generate a multi-level summary that participants can use as a complete record of the meeting.

You MUST return your response as a valid JSON object matching this schema exactly:
{
  "quick_summary": "Markdown text for a 30-second read. Include Key Decisions and Topics Discussed.",
  "standard_summary": "Markdown text for a 5-minute read. Include Executive Overview, Discussion Points, and Outcomes.",
  "deep_notes": "Markdown text for a 15-minute read. Include deep explanations of debates, options considered, and nuanced context.",
  "textbook_notes": "Highly detailed meeting minutes. Include full Action Items with deadlines/owners, Risks, Open Questions, and Follow-ups."
}

CRITICAL RULES:
- If a concept refers to a visual diagram or slide, embed markdown image links like ![Slide X](path/to/screenshot) where possible.
- Do not output generic AI filler. Structure with headings, bold text, bullet points.
- Return ONLY the raw JSON object. Do not wrap in ```json blocks."#.to_string()
    } else {
        r#"You are an expert professor and a world-class AI learning assistant attending this lecture.
Your task is to understand the lecture comprehensively from the transcript and visuals (slides, whiteboard, diagrams).
Generate a multi-level summary that students can use as a complete replacement for revisiting the lecture.

You MUST return your response as a valid JSON object matching this schema exactly:
{
  "quick_summary": "Markdown text for a 30-second read. Include Key Takeaways, Topics Covered.",
  "standard_summary": "Markdown text for a 5-minute read. Include Overview, Concepts, Definitions, Examples.",
  "deep_notes": "Markdown text for a 15-minute read. Include deep explanations, Visual explanations, common mistakes, exam tips.",
  "textbook_notes": "Comprehensive, highly detailed textbook-style chapter. Include Introduction, Learning Objectives, in-depth derivations, FAQs, Real-world applications, Interview Questions."
}

CRITICAL RULES:
- If a concept refers to a visual diagram or slide, embed markdown image links like ![Slide X](path/to/screenshot) where possible. (Use local placeholders like ![Slide 1](#) if path is unknown, we will replace it later).
- Do not output generic AI filler. Structure with headings, bold text, bullet points.
- Return ONLY the raw JSON object. Do not wrap in ```json blocks."#.to_string()
    };

    // 3. Generate content via Gemini
    let content = if image_parts.is_empty() {
        GeminiService::generate_text(&enriched_transcript, &instruction, pool).await?
    } else {
        GeminiService::generate_multimodal(&enriched_transcript, &instruction, &image_parts, pool).await?
    };

    // 4. Upsert into summaries table
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO summaries (id, lecture_id, content, model_used, summary_level) VALUES (?, ?, ?, 'gemini-3.1-flash-lite', 'multi-tier')"
    )
    .bind(id)
    .bind(lecture_id)
    .bind(content)
    .execute(pool)
    .await?;
    
    Ok(())
}
