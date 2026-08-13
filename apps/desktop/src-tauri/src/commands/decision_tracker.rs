use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::services::universal_ai::UniversalAiService;
use crate::database::DbState;

#[derive(Deserialize)]
pub struct DetectDecisionInput {
    pub transcript_buffer: String,
}

#[derive(Serialize)]
pub struct DetectDecisionOutput {
    pub decision_detected: bool,
    pub decision_text: Option<String>,
}

#[tauri::command]
pub async fn detect_decisions_live(
    app: AppHandle,
    input: DetectDecisionInput,
) -> AppResult<DetectDecisionOutput> {
    if input.transcript_buffer.trim().is_empty() {
        return Ok(DetectDecisionOutput {
            decision_detected: false,
            decision_text: None,
        });
    }

    let system_instruction = r#"You are an expert AI meeting copilot. You are listening to an ongoing conversation.
Analyze the latest statements from the transcript buffer. 
Determine if the group just reached a consensus, proposed a decision, or assigned a concrete action item.
Look for phrases like "So we're going with X", "Let's decide on Y", "I'll take ownership of Z", or "It's agreed".
Ignore casual chat or hypotheticals.
If no decision or consensus was just reached, respond exactly with "NO_DECISION".
If a decision WAS reached, generate a concise, one-sentence summary of the decision (e.g. "Launch the API on Tuesday").
Do not include conversational filler.
"#;

    let pool = app.state::<DbState>().pool.clone();
    
    let response = UniversalAiService::generate_text(
        &input.transcript_buffer,
        system_instruction,
        &pool
    ).await?;

    let trimmed = response.trim();
    if trimmed.contains("NO_DECISION") || trimmed == "NO_DECISION." {
        Ok(DetectDecisionOutput {
            decision_detected: false,
            decision_text: None,
        })
    } else {
        Ok(DetectDecisionOutput {
            decision_detected: true,
            decision_text: Some(trimmed.to_string()),
        })
    }
}

#[derive(Deserialize)]
pub struct ConfirmDecisionInput {
    pub lecture_id: String,
    pub decision_text: String,
}

#[tauri::command]
pub async fn confirm_live_decision(
    input: ConfirmDecisionInput,
    state: State<'_, DbState>,
) -> AppResult<bool> {
    let pool = &state.pool;
    let session_id = input.lecture_id;
    let decision_text = input.decision_text;

    // Check if an action items artifact already exists
    let existing = sqlx::query!(
        "SELECT id, content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'action_items' LIMIT 1",
        session_id
    ).fetch_optional(pool).await?;

    let mut items: Vec<String> = vec![];
    let mut artifact_id = uuid::Uuid::new_v4().to_string();

    if let Some(row) = existing.as_ref() {
        if let Some(id) = &row.id {
            artifact_id = id.clone();
        }
        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&row.content_json) {
            items = parsed;
        }
    }

    // Append the decision. Prefix with [Key Decision] to make it distinct.
    items.push(format!("[Key Decision] {}", decision_text));
    let new_json = serde_json::to_string(&items).unwrap_or_default();
    let now = chrono::Utc::now().timestamp_millis();

    if existing.is_some() {
        sqlx::query!(
            "UPDATE lecture_artifacts SET content_json = ? WHERE id = ?",
            new_json, artifact_id
        ).execute(pool).await?;
    } else {
        sqlx::query!(
            "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status) 
             VALUES (?, ?, 'action_items', ?, ?, 'live_decision', 1, 'done')",
            artifact_id, session_id, new_json, now
        ).execute(pool).await?;
    }

    Ok(true)
}
