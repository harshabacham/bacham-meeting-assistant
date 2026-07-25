use crate::error::AppResult;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter};

pub const USE_PIPELINE_V2: bool = true;

pub async fn run_v2(
    lecture_id: &str,
    _force: bool,
    app: &AppHandle,
    pool: &SqlitePool,
) -> AppResult<serde_json::Value> {
    // 1. Multimodal Perception & Knowledge Graph Extraction (Modules 1-11)
    let extracted = super::knowledge_extraction::KnowledgeExtractor::extract_knowledge(lecture_id, pool).await?;

    // 2. Pedagogical Summary Generation (Module 12)
    let summary = super::pedagogy_engine::PedagogyEngine::generate_textbook_summary(lecture_id, &extracted, pool).await?;

    // 3. Concept-driven Flashcards & Multi-format Quizzes (Modules 13-14)
    let _ = super::pedagogy_engine::PedagogyEngine::generate_concept_flashcards(lecture_id, &extracted.nodes, pool).await;
    let _ = super::pedagogy_engine::PedagogyEngine::generate_multi_format_quiz(lecture_id, &extracted.nodes, pool).await;

    let json_result = serde_json::to_value(&summary).unwrap_or_else(|_| serde_json::json!({}));
    let content_json = json_result.to_string();
    let hash = "v2_pipeline_hash".to_string();
    let now = chrono::Utc::now().timestamp_millis();
    use sqlx::Row;

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
        let _ = sqlx::query("INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, status, content_json, content_hash, generated_at, model_used) VALUES (?, ?, 'lecture_intelligence', 'done', ?, ?, ?, 'gemini-3.1-flash-lite')")
            .bind(id)
            .bind(lecture_id)
            .bind(content_json.clone())
            .bind(hash.clone())
            .bind(now)
            .execute(pool).await;
    }

    let _ = app.emit("artifact_progress", serde_json::json!({
        "lectureId": lecture_id,
        "artifactType": "lecture_intelligence",
        "status": "done"
    }));

    Ok(json_result)
}
