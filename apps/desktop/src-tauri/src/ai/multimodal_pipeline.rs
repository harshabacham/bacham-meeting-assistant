use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::{AppHandle, State, Emitter};
use std::path::Path;
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use crate::ai::frame_selector::{compute_phash, hamming};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneAnalysisResult {
    pub total_frames: usize,
    pub candidate_segments: usize,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Keyframe {
    pub id: String,
    pub file_path: String,
    pub captured_at: i64,
    pub is_key_frame: bool,
    pub change_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KeyframeOcrResult {
    pub id: String,
    pub file_path: String,
    pub ocr_text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingStatus {
    pub transcript_done: bool,
    pub ocr_done: bool,
    pub visual_analysis_done: bool,
    pub timeline_done: bool,
    pub ai_summary_done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssembledContext {
    pub text_payload: String,
    pub image_count: usize,
    pub has_code: bool,
    pub has_formula: bool,
    pub has_diagram: bool,
    pub has_table: bool,
    pub has_graph: bool,
}

#[tauri::command]
pub async fn analyze_video_scenes(lecture_id: String, state: State<'_, DbState>) -> AppResult<SceneAnalysisResult> {
    analyze_video_scenes_core(&lecture_id, &state.pool).await
}

pub async fn analyze_video_scenes_core(lecture_id: &str, pool: &SqlitePool) -> AppResult<SceneAnalysisResult> {
    // Phase 0: Local scene-change detection.
    
    let rows = sqlx::query!(
        "SELECT id, file_path, captured_at, phash FROM screenshots WHERE lecture_id = ? ORDER BY captured_at ASC",
        lecture_id
    )
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Ok(SceneAnalysisResult { total_frames: 0, candidate_segments: 0 });
    }

    let mut total_frames = 0;
    let mut candidate_segments = 0;
    let mut last_phash: Option<u64> = None;

    for row in rows {
        total_frames += 1;
        let mut current_hash = None;
        
        if let Some(hex) = row.phash {
            current_hash = Some(u64::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0));
        } else {
            if let Ok(h) = compute_phash(Path::new(&row.file_path)) {
                current_hash = Some(h);
                let hex_str = format!("{h:#018x}");
                let _ = sqlx::query!("UPDATE screenshots SET phash = ? WHERE id = ?", hex_str, row.id)
                    .execute(pool).await;
            }
        }

        if let Some(h) = current_hash {
            if let Some(prev) = last_phash {
                if hamming(h, prev) > 10 {
                    candidate_segments += 1;
                    last_phash = Some(h);
                }
            } else {
                candidate_segments += 1;
                last_phash = Some(h);
            }
        }
    }

    Ok(SceneAnalysisResult {
        total_frames,
        candidate_segments,
    })
}

#[tauri::command]
pub async fn extract_keyframes(lecture_id: String, state: State<'_, DbState>) -> AppResult<Vec<Keyframe>> {
    extract_keyframes_core(&lecture_id, &state.pool).await
}

pub async fn extract_keyframes_core(lecture_id: &str, pool: &SqlitePool) -> AppResult<Vec<Keyframe>> {
    // Phase 0: Keyframe selection with budget capping.
    #[allow(dead_code)]
    struct FrameData {
        id: String,
        file_path: String,
        captured_at: i64,
        phash: Option<u64>,
        ocr_text: Option<String>,
        change_magnitude: u32,
    }

    let rows = sqlx::query!(
        "SELECT id, file_path, captured_at, phash FROM screenshots WHERE lecture_id = ? ORDER BY captured_at ASC",
        lecture_id
    )
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Ok(vec![]);
    }

    let mut frames = Vec::new();
    let mut last_hash: Option<u64> = None;

    for row in &rows {
        let h = row.phash.as_ref().and_then(|hex| u64::from_str_radix(hex.trim_start_matches("0x"), 16).ok());
        let magnitude = if let (Some(curr), Some(prev)) = (h, last_hash) {
            hamming(curr, prev)
        } else {
            100 // High relevance for first frame
        };
        
        frames.push(FrameData {
            id: row.id.clone().unwrap_or_default(),
            file_path: row.file_path.clone(),
            captured_at: row.captured_at,
            phash: h,
            ocr_text: None, 
            change_magnitude: magnitude,
        });

        if magnitude > 10 {
            last_hash = h;
        }
    }

    let duration_ms = frames.last().unwrap().captured_at - frames.first().unwrap().captured_at;
    let duration_hours = duration_ms as f64 / 3_600_000.0;
    
    let mut max_keyframes = (duration_hours * 80.0) as usize;
    if max_keyframes < 30 { max_keyframes = 30; }
    if max_keyframes > 150 { max_keyframes = 150; }

    let mut candidates: Vec<&FrameData> = frames.iter().filter(|f| f.change_magnitude > 10).collect();
    candidates.sort_by(|a, b| b.change_magnitude.cmp(&a.change_magnitude));
    candidates.truncate(max_keyframes);

    let selected_ids: std::collections::HashSet<String> = candidates.into_iter().map(|f| f.id.clone()).collect();

    for row in rows {
        let id = row.id.unwrap_or_default();
        let is_key = selected_ids.contains(&id);
        
        let _ = sqlx::query!(
            "UPDATE screenshots SET is_key_frame = ? WHERE id = ?",
            is_key, id
        ).execute(pool).await;
    }

    let final_rows = sqlx::query!(
        "SELECT id, file_path, captured_at, is_key_frame, change_reason FROM screenshots WHERE lecture_id = ? AND is_key_frame = 1 ORDER BY captured_at ASC",
        lecture_id
    )
    .fetch_all(pool)
    .await?;

    Ok(final_rows.into_iter().map(|r| Keyframe {
        id: r.id.unwrap_or_default(),
        file_path: r.file_path,
        captured_at: r.captured_at,
        is_key_frame: true,
        change_reason: r.change_reason,
    }).collect())
}

#[tauri::command]
pub async fn run_ocr_on_keyframes(lecture_id: String, state: State<'_, DbState>) -> AppResult<Vec<KeyframeOcrResult>> {
    run_ocr_on_keyframes_core(&lecture_id, &state.pool).await
}

pub async fn run_ocr_on_keyframes_core(lecture_id: &str, pool: &SqlitePool) -> AppResult<Vec<KeyframeOcrResult>> {
    // Phase 1: OCR on selected keyframes
    
    // Fetch only the finalized keyframes
    let keyframes = sqlx::query!(
        "SELECT id, file_path FROM screenshots WHERE lecture_id = ? AND is_key_frame = 1",
        lecture_id
    )
    .fetch_all(pool)
    .await?;

    let mut results = Vec::new();

    for kf in keyframes {
        let pb = std::path::PathBuf::from(&kf.file_path);
        
        // Use existing OCR service
        let _ = crate::services::ocr_service::OCRService::process_image(pool, &lecture_id, &pb).await;

        // Fetch the updated row to get the OCR text
        let updated = sqlx::query!(
            "SELECT ocr_text FROM screenshots WHERE id = ?",
            kf.id
        )
        .fetch_optional(pool)
        .await?;

        let ocr_text = updated.and_then(|r| r.ocr_text);

        // Update the change_reason heuristically based on the OCR text
        if let Some(ref text) = ocr_text {
            let _ = crate::ai::frame_selector::FrameSelector::update_change_reason(pool, &kf.id.clone().unwrap_or_default(), text).await;
        }

        results.push(KeyframeOcrResult {
            id: kf.id.unwrap_or_default(),
            file_path: kf.file_path,
            ocr_text,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn build_lecture_context(lecture_id: String, state: State<'_, DbState>) -> AppResult<AssembledContext> {
    build_lecture_context_core(&lecture_id, &state.pool).await
}

pub async fn build_lecture_context_core(lecture_id: &str, pool: &SqlitePool) -> AppResult<AssembledContext> {
    // Phase 2: Context Builder
    let ctx = crate::ai::context_builder::ContextBuilder::build(pool, lecture_id, true).await?;
    let text_payload = crate::ai::context_builder::ContextBuilder::format_text_context(&ctx);
    
    // Simple heuristic checks on the assembled text/OCR content
    let lower_text = text_payload.to_lowercase();
    
    let has_code = lower_text.contains("def ") || lower_text.contains("function ") || lower_text.contains("class ") || lower_text.contains("import ") || lower_text.contains("return ") || lower_text.contains("```");
    let has_formula = lower_text.contains('∫') || lower_text.contains('∑') || lower_text.contains('∂') || lower_text.contains('√') || lower_text.contains("d/dx") || lower_text.contains('=');
    let has_diagram = lower_text.contains("diagram") || lower_text.contains("flowchart") || lower_text.contains("architecture");
    let has_table = lower_text.contains("table") || lower_text.contains("row") || lower_text.contains("column");
    let has_graph = lower_text.contains("graph") || lower_text.contains("axis") || lower_text.contains("plot") || lower_text.contains("chart");

    Ok(AssembledContext {
        text_payload,
        image_count: ctx.key_frames.len(),
        has_code,
        has_formula,
        has_diagram,
        has_table,
        has_graph,
    })
}

#[tauri::command]
pub async fn get_processing_status(_lecture_id: String, _state: State<'_, DbState>) -> AppResult<ProcessingStatus> {
    Ok(ProcessingStatus {
        transcript_done: false,
        ocr_done: false,
        visual_analysis_done: false,
        timeline_done: false,
        ai_summary_done: false,
    })
}

#[tauri::command]
pub async fn get_lecture_intelligence(lecture_id: String, state: State<'_, DbState>) -> AppResult<Option<serde_json::Value>> {
    get_lecture_intelligence_core(&lecture_id, &state.pool).await
}

pub async fn get_lecture_intelligence_core(lecture_id: &str, pool: &SqlitePool) -> AppResult<Option<serde_json::Value>> {
    let row = sqlx::query!("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done'", lecture_id)
        .fetch_optional(pool)
        .await?;
    
    if let Some(r) = row {
        if let Ok(v) = serde_json::from_str(&r.content_json) {
            return Ok(Some(v));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn generate_lecture_intelligence(lecture_id: String, force: bool, app: AppHandle, state: State<'_, DbState>) -> AppResult<serde_json::Value> {
    generate_lecture_intelligence_core(&lecture_id, force, &app, &state.pool).await
}

pub async fn generate_lecture_intelligence_core(lecture_id: &str, force: bool, app: &AppHandle, pool: &SqlitePool) -> AppResult<serde_json::Value> {
    use sha2::{Sha256, Digest};
    use crate::services::gemini_service::GeminiService;

    if crate::ai::pipeline_v2::engine::USE_PIPELINE_V2 {
        return crate::ai::pipeline_v2::engine::run_v2(lecture_id, force, app, pool).await;
    }

    // 1. Run local phases
    let _ = analyze_video_scenes_core(lecture_id, pool).await?;
    let _ = extract_keyframes_core(lecture_id, pool).await?;
    let _ = run_ocr_on_keyframes_core(lecture_id, pool).await?;
    
    let ctx = crate::ai::context_builder::ContextBuilder::build(pool, lecture_id, true).await?;
    let text_payload = crate::ai::context_builder::ContextBuilder::format_text_context(&ctx);

    let lower_text = text_payload.to_lowercase();
    let has_code = lower_text.contains("def ") || lower_text.contains("function ") || lower_text.contains("class ") || lower_text.contains("import ") || lower_text.contains("return ") || lower_text.contains("```");
    let has_formula = lower_text.contains('∫') || lower_text.contains('∑') || lower_text.contains('∂') || lower_text.contains('√') || lower_text.contains("d/dx") || lower_text.contains('=');
    let has_diagram = lower_text.contains("diagram") || lower_text.contains("flowchart") || lower_text.contains("architecture");
    let has_table = lower_text.contains("table") || lower_text.contains("row") || lower_text.contains("column");
    let has_graph = lower_text.contains("graph") || lower_text.contains("axis") || lower_text.contains("plot") || lower_text.contains("chart");

    // Phase 5: Hash caching
    let mut hasher = Sha256::new();
    hasher.update(&text_payload);
    for kf in &ctx.key_frames {
        if let Some(b64) = &kf.image_base64 {
            hasher.update(b64);
        }
    }
    let hash = hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect::<String>();

    if !force {
        use sqlx::Row;
        let existing = sqlx::query("SELECT content_json, content_hash FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done'")
            .bind(lecture_id)
            .fetch_optional(pool)
            .await?;
        if let Some(row) = existing {
            let db_hash: Option<String> = row.try_get("content_hash").unwrap_or(None);
            let db_json: String = row.try_get("content_json").unwrap_or_default();
            if db_hash.as_deref() == Some(&hash) {
                if let Ok(val) = serde_json::from_str(&db_json) {
                    return Ok(val);
                }
            }
        }
    }

    // Phase 3 & 4: Prompt and Schema
    let system = r#"You are an expert academic assistant. Generate a single highly structured JSON object representing the entire lecture intelligence context. 
You MUST pay extreme attention to any provided screenshots (like slides, whiteboard notes, or math equations). 
Image content is authoritative for visual claims (do not guess what's on screen if an image is provided showing it).
ANTI-HALLUCINATION RULES:
1. No graph/chart section without OCR or visual evidence of an actual graph.
2. No fabricated numeric values in calculations — only values traceable to transcript or OCR.
3. No invented formulas — every formula must be traceable to transcript or OCR.
4. If you cannot verify a detail from the transcript, OCR, or images, omit it."#;

    let schema = r#"Create a single comprehensive structured JSON object with the exact schema. 
Return ONLY valid JSON.
{
  "lecture_information": { "title": "string", "subject": "string", "duration_hint": "string", "instructor": "string", "date": "string" },
  "executive_summary": "string",
  "chapter_breakdown": [ { "title": "string", "summary": "string", "timestamp_hint": "string" } ],
  "formula_sheet": [ { "formula": "string", "meaning": "string", "variables": "string", "example": "string" } ],
  "problems_solved": [ { "question": "string", "step_by_step": "string", "final_answer": "string", "professors_explanation": "string" } ],
  "code_explained": [ { "language": "string", "purpose": "string", "logic": "string", "complexity": "string", "output": "string" } ],
  "key_concepts": ["string"],
  "crm_metadata": { 
    "bant": { "budget": "string|null", "authority": "string|null", "need": "string|null", "timeline": "string|null" }, 
    "action_items": [ { "task": "string", "owner": "string", "priority": "high|medium|low" } ], 
    "key_decisions": ["string"] 
  },
  "revision_notes": "string",
  "schemaVersion": 2,
  "richContent": {
    "lectureOverview": "string | null",
    "learningObjectives": ["string"],
    "topicsCovered": [ { "topic": "string", "subtopics": [ { "name": "string", "concepts": ["string"] } ] } ],
    "detailedExplanation": "markdown string | null",
    "visualConcepts": [ { "timestamp": 123, "screenshotRef": "string (the screenshot ID)", "whatAppeared": "string", "whyItMatters": "string", "howItConnects": "string" } ],
    "codeSection": { "language": "string", "purpose": "string", "explanation": "markdown", "timeComplexity": "string", "spaceComplexity": "string", "commonMistakes": ["string"], "bestPractices": ["string"] },
    "formulaSheet": [ { "formula": "string", "variables": [ { "symbol": "string", "meaning": "string" } ], "application": "string", "workedExample": "markdown", "examTips": "string" } ],
    "tables": [ { "title": "string", "markdown": "string" } ],
    "graphInterpretation": [ { "screenshotRef": "string", "axes": "string", "trend": "string", "observations": "string" } ],
    "diagrams": [ { "screenshotRef": "string", "type": "string", "explanation": "markdown" } ],
    "calculations": [ { "problem": "string", "steps": ["string"], "finalAnswer": "string" } ],
    "workedExamples": [ { "title": "string", "steps": ["string"] } ],
    "commonMistakes": ["string"],
    "examTips": ["string"],
    "onePageRevision": "markdown string | null",
    "cheatSheet": "markdown string | null",
    "memoryTricks": ["string"],
    "practiceQuestions": [ { "type": "mcq|short|long|problem|coding|numerical", "question": "string", "answer": "string" } ],
    "relatedConcepts": { "prerequisites": ["string"], "relatedTopics": ["string"], "advancedTopics": ["string"] },
    "detectedLectureType": "programming|math|science|business|law|medical|general"
  }
}

Use these hints to determine which richContent sections to populate (omit empty sections):
- has_code: {HAS_CODE}
- has_formula: {HAS_FORMULA}
- has_diagram: {HAS_DIAGRAM}
- has_table: {HAS_TABLE}
- has_graph: {HAS_GRAPH}
"#;

    let format_hint = schema
        .replace("{HAS_CODE}", &has_code.to_string())
        .replace("{HAS_FORMULA}", &has_formula.to_string())
        .replace("{HAS_DIAGRAM}", &has_diagram.to_string())
        .replace("{HAS_TABLE}", &has_table.to_string())
        .replace("{HAS_GRAPH}", &has_graph.to_string());

    let prompt = format!("{text_payload}\n\n---\n\n{format_hint}");

    let mut image_parts = Vec::new();
    for frame in &ctx.key_frames {
        if let Some(b64) = &frame.image_base64 {
            image_parts.push((b64.clone(), "image/png".to_string()));
        }
    }

    let mut retries = 1;
    let mut last_err = String::new();

    while retries >= 0 {
        let raw = if !image_parts.is_empty() {
            GeminiService::generate_multimodal(&prompt, system, &image_parts, pool).await?
        } else {
            GeminiService::generate_text(&prompt, system, pool).await?
        };

        let clean = raw.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        
        match serde_json::from_str::<serde_json::Value>(clean) {
            Ok(parsed) => {
                let content_json = parsed.to_string();
                
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

                // Timeline fallback
                if let Some(chapters) = parsed.get("chapter_breakdown") {
                    let _ = crate::services::timeline_service::TimelineService::extract_and_insert_ai_events(pool, lecture_id, &chapters.to_string()).await;
                }

                // Legacy fallback for backward compatibility
                use uuid::Uuid;
                let legacy_summary = parsed.get("executive_summary").and_then(|c| c.as_str()).unwrap_or("Structured intelligence generated.");
                let id = Uuid::new_v4().to_string();
                let _ = sqlx::query!("INSERT OR REPLACE INTO summaries (id, lecture_id, content, model_used) VALUES (?, ?, ?, 'gemini-3.1-flash-lite')", id, lecture_id, legacy_summary).execute(pool).await;

                return Ok(parsed);
            }
            Err(e) => {
                last_err = e.to_string();
                retries -= 1;
            }
        }
    }

    Err(AppError::Internal(format!("Failed to parse JSON after retries: {}", last_err)))
}
