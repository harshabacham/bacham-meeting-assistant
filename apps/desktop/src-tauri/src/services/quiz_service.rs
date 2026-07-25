use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::AppResult;

pub struct QuizService;

impl QuizService {
    pub async fn generate_quiz(pool: &SqlitePool, lecture_id: &str, transcript: &str) -> AppResult<()> {
        let instruction = "Generate a multiple choice quiz from the lecture. Return a JSON array of objects with 'question', 'answer_key', and 'options' (array of strings).";
        let content = crate::services::gemini_service::GeminiService::generate_text(transcript, instruction, pool).await?;
        
        let clean_json = content.trim_start_matches("```json").trim_end_matches("```").trim();
        
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(clean_json) {
            if let Some(arr) = json.as_array() {
                for item in arr {
                    let q = item["question"].as_str().unwrap_or_default();
                    let a = item["answer_key"].as_str().unwrap_or_default();
                    let opts = item["options"].to_string(); // JSON string
                    let id = Uuid::new_v4().to_string();
                    sqlx::query!(
                        "INSERT INTO quizzes (id, lecture_id, type, difficulty, question, answer_key, options) VALUES (?, ?, 'mcq', 'medium', ?, ?, ?)",
                        id, lecture_id, q, a, opts
                    ).execute(pool).await?;
                }
            }
        }
        Ok(())
    }
}
