use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::quiz_session_service::{QuizSessionService, QuizSession, QuizAnswer, QuizResult};

#[tauri::command]
pub async fn quiz_sessions_create(
    lecture_id: String,
    mode: String,
    time_limit_seconds: Option<i64>,
    state: State<'_, DbState>,
) -> AppResult<String> {
    QuizSessionService::create_session(&state.pool, &lecture_id, &mode, time_limit_seconds).await
}

#[tauri::command]
pub async fn quiz_sessions_complete(
    session_id: String,
    answers: Vec<QuizAnswer>,
    state: State<'_, DbState>,
) -> AppResult<QuizResult> {
    QuizSessionService::complete_session(&state.pool, &session_id, answers).await
}

#[tauri::command]
pub async fn quiz_sessions_list(
    lecture_id: String,
    state: State<'_, DbState>,
) -> AppResult<Vec<QuizSession>> {
    QuizSessionService::list_sessions(&state.pool, &lecture_id).await
}

/// List all quiz questions for a lecture.
#[tauri::command]
pub async fn quiz_list(lecture_id: String, state: State<'_, DbState>) -> AppResult<Vec<serde_json::Value>> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT id, type, difficulty, question, answer_key, options \
         FROM quizzes WHERE lecture_id = ? ORDER BY rowid ASC"
    )
    .bind(&lecture_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(rows.into_iter().map(|r| serde_json::json!({
        "id": r.get::<String, _>("id"),
        "type": r.get::<String, _>("type"),
        "difficulty": r.get::<String, _>("difficulty"),
        "question": r.get::<String, _>("question"),
        "answerKey": r.get::<String, _>("answer_key"),
        "options": r.get::<Option<String>, _>("options"),
    })).collect())
}
