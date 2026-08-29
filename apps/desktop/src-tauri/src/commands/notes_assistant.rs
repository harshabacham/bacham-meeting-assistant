use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::services::universal_ai::UniversalAiService;
use crate::database::DbState;

#[derive(Deserialize)]
pub struct EnhanceNotesInput {
    pub raw_notes: String,
    pub transcript_context: Option<String>,
}

#[derive(Serialize)]
pub struct EnhanceNotesOutput {
    pub enhanced_markdown: String,
}

#[tauri::command]
pub async fn enhance_notes_live(
    app: AppHandle,
    input: EnhanceNotesInput,
) -> AppResult<EnhanceNotesOutput> {
    let pool = app.state::<DbState>().pool.clone();

    let mut system_instruction = String::from(
        "You are an expert AI meeting assistant. Your task is to take the user's raw, messy, or incomplete meeting notes and transform them into a beautifully structured, highly readable Markdown document.\n\
        Organize the notes logically with headings, bullet points, and bold text for emphasis. Correct typos and expand on shorthand if the meaning is obvious.\n"
    );

    if let Some(ctx) = input.transcript_context {
        if !ctx.trim().is_empty() {
            system_instruction.push_str("\nHere is some recent transcript context from the meeting to help you accurately expand on the notes:\n");
            system_instruction.push_str(&ctx);
        }
    }

    let response = UniversalAiService::generate_text(
        &input.raw_notes,
        &system_instruction,
        &pool
    ).await?;

    Ok(EnhanceNotesOutput {
        enhanced_markdown: response.trim().to_string(),
    })
}
