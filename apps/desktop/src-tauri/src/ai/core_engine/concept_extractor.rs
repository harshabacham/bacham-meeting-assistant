use sqlx::SqlitePool;
use crate::error::AppResult;
use uuid::Uuid;
use crate::ai::context_builder::ContextBuilder;
use crate::ai::core_engine::models::KnowledgeConcept;

pub async fn extract_concepts(lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
    // 1. Fetch transcript and keyframes
    let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
    
    let mut enriched_transcript = String::new();
    let mut image_parts = Vec::new();

    if !ctx.transcript_segments.is_empty() {
        for segment in &ctx.transcript_segments {
            enriched_transcript.push_str(&segment.content);
            enriched_transcript.push_str("\n\n");
        }
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

    let instruction = r#"Analyze the following lecture transcript and visual frames.
Extract key concepts, definitions, formulas, and real-world applications to build a Knowledge Graph.
Return a valid JSON array of objects, where each object matches this schema exactly:
[
  {
    "concept_type": "formula" | "code" | "diagram" | "exam_tip" | "common_mistake" | "definition" | "application",
    "title": "Short title",
    "description": "Detailed description",
    "structured_data": {} // Optional JSON with variables, examples, etc.
  }
]
Do not output generic AI filler. Return ONLY the raw JSON array. Do not wrap in ```json blocks."#;

    // 2. Call Gemini
    let content = if image_parts.is_empty() {
        crate::services::universal_ai::UniversalAiService::generate_text(&enriched_transcript, instruction, pool).await?
    } else {
        crate::services::universal_ai::UniversalAiService::generate_multimodal(&enriched_transcript, instruction, &image_parts, pool).await?
    };

    // 3. Parse JSON and insert into extracted_concepts
    if let Ok(concepts) = serde_json::from_str::<Vec<KnowledgeConcept>>(&content) {
        for concept in concepts {
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO extracted_concepts (id, lecture_id, concept_type, title, description, structured_data) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(id)
            .bind(lecture_id)
            .bind(concept.concept_type)
            .bind(concept.title)
            .bind(concept.description)
            .bind(concept.structured_data.map(|v| v.to_string()))
            .execute(pool)
            .await?;
        }
    }

    sqlx::query(
        "UPDATE analysis_modules SET concept_extraction_done = 1 WHERE lecture_id = ?"
    )
    .bind(lecture_id)
    .execute(pool)
    .await?;

    Ok(())
}
