/// IntelligenceEngine — Orchestrates generation of all lecture artifacts.
///
/// Runs as a background task queue triggered after SESSION_STOP.
/// Each artifact generates independently — a failed formula-sheet
/// generation does not block the summary from completing.
/// Per-artifact status is emitted via `artifact_progress` events.
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;
use serde_json;
use crate::ai::context_builder::ContextBuilder;
use crate::error::{AppError, AppResult};

pub const ALL_ARTIFACT_TYPES: &[&str] = &[
    "lecture_intelligence",
];

pub struct IntelligenceEngine;

impl IntelligenceEngine {
    /// Generate all artifacts for a lecture as independent background tasks.
    /// Called after transcription completes in the SessionStop pipeline.
    pub async fn generate_all(app: AppHandle, lecture_id: String) {
        let pool = match app.try_state::<crate::database::DbState>() {
            Some(s) => s.pool.clone(),
            None => {
                eprintln!("[IntelligenceEngine] DB not ready for lecture {lecture_id}");
                return;
            }
        };

        // Phase 1.7 AI Cache check
        let existing = sqlx::query!("SELECT status FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence'", lecture_id)
            .fetch_optional(&pool)
            .await;
            
        if let Ok(Some(row)) = existing {
            if row.status == "done" {
                eprintln!("[IntelligenceEngine] Cache hit for {lecture_id}, skipping queue.");
                return;
            }
        }

        // Insert into ai_jobs queue
        let job_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        let res = sqlx::query(
            "INSERT INTO ai_jobs (id, lecture_id, job_type, status, payload_json, created_at, updated_at) VALUES (?, ?, 'lecture_intelligence', 'pending', '{}', ?, ?)",
        )
        .bind(job_id)
        .bind(lecture_id.clone())
        .bind(&now)
        .bind(&now)
        .execute(&pool).await;

        if let Err(e) = res {
            eprintln!("[IntelligenceEngine] Failed to enqueue job: {}", e);
            return;
        }

        // Mark all artifacts as pending
        for &artifact_type in ALL_ARTIFACT_TYPES {
            let _ = Self::upsert_artifact_status(&pool, &lecture_id, artifact_type, "pending", "{}").await;
            let _ = app.emit("artifact_progress", serde_json::json!({
                "lectureId": lecture_id,
                "artifactType": artifact_type,
                "status": "pending"
            }));
        }
    }

    /// Executed by the QueueWorker
    pub async fn execute_job(app: &AppHandle, lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
        for &artifact_type in ALL_ARTIFACT_TYPES {
            let _ = app.emit("artifact_progress", serde_json::json!({
                "lectureId": lecture_id,
                "artifactType": artifact_type,
                "status": "generating"
            }));
            let _ = Self::upsert_artifact_status(pool, lecture_id, artifact_type, "generating", "{}").await;
        }

        // Call the new multimodal pipeline!
        match crate::ai::multimodal_pipeline::generate_lecture_intelligence_core(lecture_id, false, app, pool).await {
            Ok(_) => Ok(()),
            Err(e) => {
                for &artifact_type in ALL_ARTIFACT_TYPES {
                    let _ = Self::upsert_artifact_status(pool, lecture_id, artifact_type, "error", "{}").await;
                    let _ = app.emit("artifact_progress", serde_json::json!({
                        "lectureId": lecture_id,
                        "artifactType": artifact_type,
                        "status": "error",
                        "error": e.to_string()
                    }));
                }
                Err(e)
            }
        }
    }

    /// Generate a single artifact type using the grounded context.
    async fn generate_artifact(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
        text_context: &str,
        image_parts: &[(String, String)],
    ) -> AppResult<String> {
        let (system, format_hint) = Self::prompt_for_type(artifact_type);

        let prompt = format!(
            "{text_context}\n\n---\n\n{format_hint}"
        );

        let raw = if (artifact_type == "summary" || artifact_type == "detailed_notes" || artifact_type == "formula_sheet" || artifact_type == "important_code") && !image_parts.is_empty() {
            crate::services::universal_ai::UniversalAiService::generate_multimodal(&prompt, system, image_parts, pool).await?
        } else {
            crate::services::universal_ai::UniversalAiService::generate_text(&prompt, system, pool).await?
        };

        // Try to parse as JSON; if it's not valid JSON (plain text), wrap it.
        let content_json = if raw.trim().starts_with('{') || raw.trim().starts_with('[') {
            let clean = raw
                .trim_start_matches("```json")
                .trim_start_matches("```")
                .trim_end_matches("```")
                .trim();
            match serde_json::from_str::<serde_json::Value>(clean) {
                Ok(_) => clean.to_string(),
                Err(_) => serde_json::json!({ "content": raw }).to_string(),
            }
        } else {
            serde_json::json!({ "content": raw }).to_string()
        };

        // Also populate the legacy summaries table for backward compat
        if artifact_type == "summary" {
            let id = Uuid::new_v4().to_string();
            let _ = sqlx::query!(
                "INSERT OR REPLACE INTO summaries (id, lecture_id, content, model_used) \
                 VALUES (?, ?, ?, 'gemini-2.0-flash-lite')",
                id,
                lecture_id,
                raw
            )
            .execute(pool)
            .await;
        }

        Ok(content_json)
    }

    fn prompt_for_type(artifact_type: &str) -> (&'static str, &'static str) {
        match artifact_type {
            "summary" => (
                "You are an expert academic assistant. Produce a clear, structured summary.",
                "Write a comprehensive summary of this lecture. Use markdown headers and bullet points. \
                 Also include a JSON object at the end with key: 'ai_insights', value: array of objects \
                 {label: string, timestamp_hint: string} for the 3 most important moments in the lecture. \
                 Format: {\"content\": \"<markdown summary>\", \"ai_insights\": [{\"label\": \"...\", \"timestamp_hint\": \"...\"}]}"
            ),
            "detailed_notes" => (
                "You are an expert academic note-taker.",
                "Generate detailed, comprehensive notes from this lecture in markdown format. \
                 Include all key concepts, definitions, examples, and explanations. \
                 Return as JSON: {\"content\": \"<markdown notes>\"}"
            ),
            "chapter_breakdown" => (
                "You are an expert at organizing lecture content into chapters.",
                "Break this lecture down into logical chapters/sections. \
                 Return as JSON: {\"chapters\": [{\"title\": string, \"summary\": string, \"timestamp_hint\": string}]}"
            ),
            "important_topics" => (
                "You are an expert at identifying the core topics of a lecture.",
                "List the most important topics covered in this lecture. \
                 Return as JSON: {\"topics\": [{\"topic\": string, \"importance\": \"high|medium|low\", \"description\": string}]}"
            ),
            "definitions" => (
                "You are an expert at extracting definitions and terminology.",
                "Extract all key definitions and technical terms from this lecture. \
                 Return as JSON: {\"definitions\": [{\"term\": string, \"definition\": string}]}"
            ),
            "formula_sheet" => (
                "You are an expert at identifying mathematical and scientific formulas.",
                "Extract all formulas, equations, and mathematical expressions from this lecture. \
                 Use LaTeX notation where possible. \
                 Return as JSON: {\"formulas\": [{\"name\": string, \"formula\": string, \"description\": string}]}"
            ),
            "important_code" => (
                "You are an expert programmer and educator.",
                "Extract all code examples, algorithms, and programming concepts from this lecture. \
                 Return as JSON: {\"code_blocks\": [{\"title\": string, \"language\": string, \"code\": string, \"explanation\": string}]}"
            ),
            "cheat_sheet" => (
                "You are an expert at creating concise study references.",
                "Create a comprehensive cheat sheet for this lecture — the kind a student would want \
                 during an exam. Markdown format, very concise. \
                 Return as JSON: {\"content\": \"<markdown cheat sheet>\"}"
            ),
            "key_takeaways" => (
                "You are an expert at distilling the essential lessons from a lecture.",
                "List 5-10 key takeaways from this lecture — what the student absolutely must remember. \
                 Return as JSON: {\"takeaways\": [{\"takeaway\": string, \"priority\": \"must-know|good-to-know\"}]}"
            ),
            "mind_map" => (
                "You are an expert at creating hierarchical mind maps.",
                "Create a hierarchical mind map structure for this lecture. \
                 Return as JSON: {\"root\": {\"label\": string, \"children\": [{\"label\": string, \"children\": [...]}]}}"
            ),
            "action_items" => (
                "You are an expert at identifying follow-up actions from lectures.",
                "Extract any action items, to-dos, assignments, or next steps mentioned in this lecture. \
                 Return as JSON: {\"items\": [{\"action\": string, \"priority\": \"high|medium|low\"}]}"
            ),
            "homework" => (
                "You are an expert at identifying homework and assignments from lectures.",
                "Extract any homework assignments, readings, or exercises mentioned in this lecture. \
                 Return as JSON: {\"assignments\": [{\"title\": string, \"description\": string, \"due_hint\": string}]}"
            ),
            "resources" => (
                "You are an expert at identifying academic resources.",
                "Extract any books, papers, websites, tools, or other resources mentioned in this lecture. \
                 Return as JSON: {\"resources\": [{\"title\": string, \"type\": \"book|paper|website|tool|other\", \"description\": string}]}"
            ),
            _ => (
                "You are an expert academic assistant.",
                "Analyze this lecture and provide relevant information. Return as JSON: {\"content\": \"<analysis>\"}"
            ),
        }
    }

    async fn upsert_artifact_status(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
        status: &str,
        content_json: &str,
    ) -> AppResult<()> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query!(
            "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, status) \
             VALUES (?, ?, ?, ?, ?, 'gemini-2.0-flash-lite', ?) \
             ON CONFLICT(id) DO UPDATE SET status = excluded.status",
            id, lecture_id, artifact_type, content_json, now, status
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }

    async fn upsert_artifact_done(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
        content_json: &str,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();

        // Get current max version for this lecture+type
        let version_row = sqlx::query!(
            "SELECT COALESCE(MAX(version), 0) as max_v FROM lecture_artifacts \
             WHERE lecture_id = ? AND artifact_type = ?",
            lecture_id, artifact_type
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let new_version = version_row.max_v + 1;
        let id = Uuid::new_v4().to_string();

        sqlx::query!(
            "INSERT INTO lecture_artifacts \
             (id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status) \
             VALUES (?, ?, ?, ?, ?, 'gemini-2.0-flash-lite', ?, 'done')",
            id, lecture_id, artifact_type, content_json, now, new_version
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }

    /// Regenerate a single artifact type for a lecture.
    pub async fn regenerate_artifact(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
    ) -> AppResult<String> {
        let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
        let text_context = ContextBuilder::format_text_context(&ctx);
        let mut image_parts = Vec::new();
        for frame in &ctx.key_frames {
            if let Some(b64) = &frame.image_base64 {
                image_parts.push((b64.clone(), "image/png".to_string()));
            }
        }
        
        let content_json = Self::generate_artifact(pool, lecture_id, artifact_type, &text_context, &image_parts).await?;
        Self::upsert_artifact_done(pool, lecture_id, artifact_type, &content_json).await?;
        Ok(content_json)
    }

    pub async fn generate_embeddings(
        app: AppHandle,
        lecture_id: String,
        full_transcript: String,
    ) {
        let pool = match app.try_state::<crate::database::DbState>() {
            Some(s) => s.pool.clone(),
            None => return,
        };

        let api_key = match keyring::Entry::new("bacham", "gemini_api_key") {
            Ok(entry) => entry.get_password().ok(),
            Err(_) => None,
        };
        let api_key = api_key.or_else(|| std::env::var("GEMINI_API_KEY").ok());
        
        let words: Vec<&str> = full_transcript.split_whitespace().collect();
        let chunk_size = 150;
        let overlap = 30;
        let mut chunks = Vec::new();
        
        let mut i = 0;
        while i < words.len() {
            let end = std::cmp::min(i + chunk_size, words.len());
            let chunk_text = words[i..end].join(" ");
            chunks.push(chunk_text);
            if end == words.len() { break; }
            i += chunk_size - overlap;
        }

        let vector_db = crate::services::vector_db::VectorDb::new(pool.clone());
        let _ = vector_db.init_tables().await;
        
        if let Ok(embedding_service) = crate::services::embedding_service::EmbeddingService::new().await {
            for chunk in chunks {
                if chunk.trim().is_empty() { continue; }
                let use_local = false; 
                if let Ok(emb) = embedding_service.embed_text(&chunk, use_local, api_key.as_deref()).await {
                    let _ = vector_db.insert_chunk(&lecture_id, &chunk, emb).await;
                }
            }
        }
    }
}
