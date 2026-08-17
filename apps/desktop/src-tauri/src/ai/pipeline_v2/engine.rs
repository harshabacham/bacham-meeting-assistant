use crate::error::AppResult;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter};

pub const USE_PIPELINE_V2: bool = true;

pub async fn run_v2(
    lecture_id: &str,
    force: bool,
    app: &AppHandle,
    pool: &SqlitePool,
) -> AppResult<serde_json::Value> {
    use sqlx::Row;

    if !force {
        let existing = sqlx::query("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done'")
            .bind(lecture_id)
            .fetch_optional(pool).await;
        if let Ok(Some(row)) = existing {
            let db_json: String = row.get("content_json");
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&db_json) {
                return Ok(val);
            }
        }
    }

    // 1. Context & Multimodal Builder
    let ctx = crate::ai::context_builder::ContextBuilder::build(pool, lecture_id, true).await?;
    
    // Construct rich transcript
    let mut full_transcript = String::new();
    for seg in &ctx.transcript_segments {
        full_transcript.push_str(&seg.content);
        full_transcript.push('\n');
    }

    // Construct visual OCR and slide context
    let mut visual_context = String::new();
    let mut image_parts: Vec<(String, String)> = Vec::new();
    for kf in &ctx.key_frames {
        let mm = kf.captured_at / 60000;
        let ss = (kf.captured_at % 60000) / 1000;
        let reason = kf.change_reason.as_deref().unwrap_or("Slide");
        visual_context.push_str(&format!("[Slide @ {:02}:{:02} — {}] OCR: {}\n", mm, ss, reason, kf.ocr_text.as_deref().unwrap_or("No OCR detected")));
        if let Some(b64) = &kf.image_base64 {
            if image_parts.len() < 12 {
                image_parts.push(("image/png".to_string(), b64.clone()));
            }
        }
    }

    // 2. Multimodal Perception & Knowledge Graph Extraction (Modules 1-11)
    let extracted = super::knowledge_extraction::KnowledgeExtractor::extract_knowledge(lecture_id, pool).await?;

    // 3. Grounded Pedagogical & Meeting Summary Generation (Module 12)
    let summary = super::pedagogy_engine::PedagogyEngine::generate_textbook_summary(
        lecture_id,
        &extracted,
        &full_transcript,
        &visual_context,
        &image_parts,
        pool,
    ).await?;

    // 4. Concept-driven Flashcards & Multi-format Quizzes (Modules 13-14)
    let _ = super::pedagogy_engine::PedagogyEngine::generate_concept_flashcards(lecture_id, &extracted.nodes, pool).await;
    let _ = super::pedagogy_engine::PedagogyEngine::generate_multi_format_quiz(lecture_id, &extracted.nodes, pool).await;

    let json_result = serde_json::to_value(&summary).unwrap_or_else(|_| serde_json::json!({}));
    let content_json = json_result.to_string();
    let hash = format!("v2_hash_{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().timestamp_millis();

    let existing = sqlx::query("SELECT id FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence'")
        .bind(lecture_id)
        .fetch_optional(pool).await;
    
    if let Ok(Some(row)) = existing {
        let row_id: String = row.get("id");
        let _ = sqlx::query("UPDATE lecture_artifacts SET content_json = ?, content_hash = ?, generated_at = ?, status = 'done' WHERE id = ?")
            .bind(content_json.clone())
            .bind(hash.clone())
            .bind(now)
            .bind(row_id)
            .execute(pool).await;
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        let _ = sqlx::query("INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, status, content_json, content_hash, generated_at, model_used) VALUES (?, ?, 'lecture_intelligence', 'done', ?, ?, ?, 'gemini-2.0-flash-lite')")
            .bind(id)
            .bind(lecture_id)
            .bind(content_json.clone())
            .bind(hash.clone())
            .bind(now)
            .execute(pool).await;
    }

    // Also update summaries table
    let _ = sqlx::query(
        "INSERT INTO summaries (id, lecture_id, content, generated_at) VALUES (?, ?, ?, ?)"
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(lecture_id)
    .bind(&content_json)
    .bind(now)
    .execute(pool)
    .await;

    let _ = app.emit("artifact_progress", serde_json::json!({
        "lectureId": lecture_id,
        "artifactType": "lecture_intelligence",
        "status": "done"
    }));

    Ok(json_result)
}
