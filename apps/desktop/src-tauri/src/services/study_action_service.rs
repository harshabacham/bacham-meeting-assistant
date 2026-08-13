use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;
use crate::ai::context_engine::{ChatScope, ContextEngine};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum StudyActionType {
    Summary,
    Flashcards,
    Quiz,
    CheatSheet,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudyActionRun {
    pub id: String,
    pub action_type: String,
    pub scope_type: String,
    pub scope_ref_json: String,
    pub result_ref: Option<String>,
    pub status: String,
    pub created_at: String,
}

use tauri::{AppHandle, Manager};

pub struct StudyActionService;

impl StudyActionService {
    pub async fn run_action(app: &AppHandle, action: StudyActionType, scope: &ChatScope) -> AppResult<StudyActionRun> {
        let pool = &app.state::<crate::database::DbState>().pool;
        let run_id = Uuid::new_v4().to_string();
        let scope_type = match scope {
            ChatScope::Lecture(_) => "lecture",
            ChatScope::MultiLecture(_) => "multi_lecture",
            ChatScope::Folder(_) => "folder",
            ChatScope::Subject(_) => "subject",
            ChatScope::Semester(_) => "semester",
            ChatScope::Library => "library",
        }.to_string();
        
        let scope_ref_json = serde_json::to_string(scope).unwrap_or_default();
        let now = Utc::now().to_rfc3339();
        
        let action_str = match action {
            StudyActionType::Summary => "summary",
            StudyActionType::Flashcards => "flashcards",
            StudyActionType::Quiz => "quiz",
            StudyActionType::CheatSheet => "cheat_sheet",
        }.to_string();

        sqlx::query!(
            "INSERT INTO study_action_runs (id, action_type, scope_type, scope_ref_json, status, created_at)
             VALUES (?, ?, ?, ?, 'running', ?)",
            run_id, action_str, scope_type, scope_ref_json, now
        ).execute(pool).await.map_err(|e| AppError::Internal(e.to_string()))?;
        
        let run = StudyActionRun {
            id: run_id.clone(),
            action_type: action_str,
            scope_type,
            scope_ref_json,
            result_ref: None,
            status: "running".to_string(),
            created_at: now,
        };

        let pool_clone = pool.clone();
        let scope_clone = scope.clone();
        let action_clone = action.clone();
        let app_clone = app.clone();
        
        tauri::async_runtime::spawn(async move {
            let res = Self::execute_action(&app_clone, action_clone, &scope_clone).await;
            
            let status = if res.is_ok() { "done" } else { "error" };
            let result_ref = res.ok().unwrap_or_default();
            let result_ref_opt = if result_ref.is_empty() { None } else { Some(result_ref) };
            
            let _ = sqlx::query!(
                "UPDATE study_action_runs SET status = ?, result_ref = ? WHERE id = ?",
                status, result_ref_opt, run_id
            ).execute(&pool_clone).await;
        });

        Ok(run)
    }

    async fn execute_action(app: &AppHandle, action: StudyActionType, scope: &ChatScope) -> AppResult<String> {
        let pool = &app.state::<crate::database::DbState>().pool;

        // Phase 7: Use lecture_intelligence if it's a single lecture scope!
        if let ChatScope::Lecture(lecture_id) = scope {
            if let Ok(Some(intelligence)) = crate::ai::multimodal_pipeline::get_lecture_intelligence_core(lecture_id, pool).await {
                // Return a mocked generated string based on the rich content if we can,
                // or just fall back to generating if the data isn't easily mapped to a string.
                if let Some(rich) = intelligence.get("richContent") {
                    let _output = String::new();
                    match action {
                        StudyActionType::Summary => {
                            if let Some(s) = intelligence.get("executive_summary").and_then(|v| v.as_str()) { return Ok(s.to_string()); }
                        },
                        StudyActionType::CheatSheet => {
                            if let Some(s) = rich.get("cheatSheet").and_then(|v| v.as_str()) { return Ok(s.to_string()); }
                            if let Some(s) = rich.get("onePageRevision").and_then(|v| v.as_str()) { return Ok(s.to_string()); }
                        },
                        StudyActionType::Flashcards => {}, // Let it fall through to generation
                        StudyActionType::Quiz => {
                            // Extract practiceQuestions if they exist
                            if let Some(qs) = rich.get("practiceQuestions").and_then(|v| v.as_array()) {
                                let mut questions = Vec::new();
                                for q in qs {
                                    questions.push(serde_json::json!({
                                        "question": q.get("question").and_then(|v| v.as_str()).unwrap_or(""),
                                        "options": ["Option A", "Option B", "Option C", "Option D"],
                                        "correct_index": 0,
                                        "explanation": q.get("answer").and_then(|v| v.as_str()).unwrap_or("")
                                    }));
                                }
                                return Ok(serde_json::json!({"questions": questions}).to_string());
                            }
                        }
                    }
                }
            }
        }

        let bundle = ContextEngine::build_context_bundle(pool, scope, "").await?;
        
        let (prompt, _format) = match action {
            StudyActionType::Summary => (
                "Generate a comprehensive and well-structured summary of the provided materials.",
                "markdown"
            ),
            StudyActionType::Flashcards => (
                "Generate flashcards for the provided materials. Output MUST be valid JSON matching this schema: {\"cards\": [{\"front\": \"string\", \"back\": \"string\"}]}",
                "json"
            ),
            StudyActionType::Quiz => (
                "Generate a multiple-choice quiz for the provided materials. Output MUST be valid JSON matching this schema: {\"questions\": [{\"question\": \"string\", \"options\": [\"string\"], \"correct_index\": number, \"explanation\": \"string\"}]}",
                "json"
            ),
            StudyActionType::CheatSheet => (
                "Create a dense, high-yield cheat sheet with the most important formulas, definitions, and concepts from the provided materials. Format as Markdown.",
                "markdown"
            ),
        };
        
        let system_instruction = format!("You are an expert tutor. Rely strictly on the following context:\n{}", bundle.assembled_context);
        
        let provider = crate::ai::providers::ProviderEngine::get_provider(app).await?;
        let request = crate::ai::providers::GenerationRequest {
            system_instruction,
            history: vec![],
            prompt: prompt.to_string(),
        };

        let res = provider.generate_stream(app, request, "dummy_study_event").await?;
        let text = res.text;
        
        // Strip markdown code blocks if format is JSON
        let text = if text.starts_with("```json") {
            let t = text.trim_start_matches("```json").trim_end_matches("```").trim();
            t.to_string()
        } else {
            text
        };

        Ok(text)
    }

    pub async fn get_status(pool: &SqlitePool, run_id: &str) -> AppResult<StudyActionRun> {
        let row = sqlx::query!(
            "SELECT id, action_type, scope_type, scope_ref_json, result_ref, status, created_at FROM study_action_runs WHERE id = ?",
            run_id
        ).fetch_one(pool).await.map_err(|e| AppError::Internal(e.to_string()))?;
        
        Ok(StudyActionRun {
            id: row.id.unwrap_or_default(),
            action_type: row.action_type,
            scope_type: row.scope_type,
            scope_ref_json: row.scope_ref_json,
            result_ref: row.result_ref,
            status: row.status,
            created_at: row.created_at,
        })
    }
}
