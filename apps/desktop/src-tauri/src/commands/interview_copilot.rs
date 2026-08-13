use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::services::universal_ai::UniversalAiService;
use crate::database::DbState;

#[derive(Deserialize)]
pub struct AnalyzeInterviewInput {
    pub transcript_buffer: String,
}

#[derive(Serialize)]
pub struct AnalyzeInterviewOutput {
    pub question_detected: bool,
    pub suggested_answer: Option<String>,
}

#[tauri::command]
pub async fn analyze_interview_live(
    app: AppHandle,
    input: AnalyzeInterviewInput,
) -> AppResult<AnalyzeInterviewOutput> {
    if input.transcript_buffer.trim().is_empty() {
        return Ok(AnalyzeInterviewOutput {
            question_detected: false,
            suggested_answer: None,
        });
    }

    let system_instruction = r#"You are an expert AI Interview Copilot running in real-time.
You are listening to a live interview transcript.
Analyze the latest statements. 
Determine if the INTERVIEWER just asked a significant question that requires a response from the candidate.
Ignore simple conversational fillers, rhetorical questions, or the candidate's own questions.
If no significant question was asked by the interviewer, respond exactly with "NO_QUESTION".
If a question WAS asked, generate a highly effective, concise, bulleted answer using the STAR (Situation, Task, Action, Result) method or a structured direct response.
Keep the answer under 4 bullet points, extremely concise so the candidate can read it quickly.
Do not include conversational filler like "Here is an answer". Just output the bullet points.
"#;

    let pool = app.state::<DbState>().pool.clone();
    
    // Use the universal AI provider to generate the text
    let response = UniversalAiService::generate_text(
        &input.transcript_buffer,
        system_instruction,
        &pool
    ).await?;

    let trimmed = response.trim();
    if trimmed.contains("NO_QUESTION") || trimmed == "NO_QUESTION." {
        Ok(AnalyzeInterviewOutput {
            question_detected: false,
            suggested_answer: None,
        })
    } else {
        Ok(AnalyzeInterviewOutput {
            question_detected: true,
            suggested_answer: Some(trimmed.to_string()),
        })
    }
}
