use serde::{Serialize, Deserialize};
use tauri::AppHandle;
use crate::error::{AppError, AppResult};
use crate::ai::context_engine::{ContextEngine, ChatScope};
use crate::ai::providers::GenerationRequest;
use crate::database::DbState;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PatternConcept {
    pub name: String,
    pub description: String,
    pub occurrences: usize,
    pub lecture_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PatternResult {
    pub repeated_concepts: Vec<PatternConcept>,
    pub repeated_formulas: Vec<PatternConcept>,
    pub weak_topics: Vec<PatternConcept>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ComparisonResult {
    pub common_topics: Vec<String>,
    pub differences: Vec<String>,
    pub missing_concepts: Vec<String>,
}

pub struct PatternService;

impl PatternService {
    pub async fn detect_patterns(app: &AppHandle, scope: ChatScope) -> AppResult<PatternResult> {
        let pool = app.state::<DbState>().pool.clone();
        
        let bundle = ContextEngine::build_context_bundle(&pool, &scope, "").await?;
        if bundle.lecture_ids.is_empty() {
            return Err(AppError::Internal("No lectures found in scope for pattern detection.".to_string()));
        }

        let system_instruction = r#"You are an AI analyzing a set of lecture notes and transcripts.
Your goal is to detect recurring patterns.
Output ONLY valid JSON matching this schema:
{
  "repeatedConcepts": [
    { "name": "String", "description": "String", "occurrences": 0, "lectureIds": ["String"] }
  ],
  "repeatedFormulas": [
    { "name": "String", "description": "String", "occurrences": 0, "lectureIds": ["String"] }
  ],
  "weakTopics": [
    { "name": "String", "description": "String", "occurrences": 0, "lectureIds": ["String"] }
  ]
}
Identify concepts and formulas that appear across multiple lectures. For "weak topics", highlight areas that seem complex or underexplained in the provided text. Return raw JSON without markdown formatting."#.to_string();

        let request = GenerationRequest {
            system_instruction,
            history: vec![],
            prompt: format!("Analyze the following context and detect patterns:\n\n{}", bundle.assembled_context),
        };

        let provider = crate::ai::providers::ProviderEngine::get_provider(app).await?;
        // We can ignore the streaming event by passing a dummy event name.
        let response = provider.generate_stream(app, request, "dummy_pattern_event").await?;
        
        let json_str = response.text.replace("```json", "").replace("```", "").trim().to_string();
        let result: PatternResult = serde_json::from_str(&json_str)
            .map_err(|e| AppError::Internal(format!("Failed to parse pattern result: {}", e)))?;
            
        Ok(result)
    }

    pub async fn compare_lectures(app: &AppHandle, lecture_ids: Vec<String>) -> AppResult<ComparisonResult> {
        if lecture_ids.len() < 2 {
            return Err(AppError::Internal("Need at least 2 lectures to compare.".to_string()));
        }

        let pool = app.state::<DbState>().pool.clone();
        let scope = ChatScope::MultiLecture(lecture_ids);
        let bundle = ContextEngine::build_context_bundle(&pool, &scope, "").await?;
        
        let system_instruction = r#"You are an AI comparing multiple lectures.
Output ONLY valid JSON matching this schema:
{
  "commonTopics": ["String"],
  "differences": ["String"],
  "missingConcepts": ["String"]
}
Identify what topics are shared, how the lectures differ in focus or detail, and if any logical prerequisite concepts seem to be missing between them. Return raw JSON without markdown formatting."#.to_string();

        let request = GenerationRequest {
            system_instruction,
            history: vec![],
            prompt: format!("Compare the following lectures:\n\n{}", bundle.assembled_context),
        };

        let provider = crate::ai::providers::ProviderEngine::get_provider(app).await?;
        let response = provider.generate_stream(app, request, "dummy_compare_event").await?;
        
        let json_str = response.text.replace("```json", "").replace("```", "").trim().to_string();
        let result: ComparisonResult = serde_json::from_str(&json_str)
            .map_err(|e| AppError::Internal(format!("Failed to parse comparison result: {}", e)))?;
            
        Ok(result)
    }
}
