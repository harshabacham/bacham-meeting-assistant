use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizSession {
    pub id: String,
    pub lecture_id: String,
    pub mode: String,
    pub time_limit_seconds: Option<i64>,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub score_pct: Option<f64>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizAnswer {
    pub quiz_id: String,
    pub submitted_answer: String,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizResult {
    pub session_id: String,
    pub total: usize,
    pub correct: usize,
    pub score_pct: f64,
    pub answers: Vec<QuizAnswerResult>,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizAnswerResult {
    pub quiz_id: String,
    pub submitted_answer: String,
    pub correct_answer: String,
    pub is_correct: bool,
}

pub struct QuizSessionService;

impl QuizSessionService {
    pub async fn create_session(
        pool: &SqlitePool,
        lecture_id: &str,
        mode: &str,
        time_limit_seconds: Option<i64>,
    ) -> AppResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        sqlx::query!(
            "INSERT INTO quiz_sessions (id, lecture_id, mode, time_limit_seconds, started_at) \
             VALUES (?, ?, ?, ?, ?)",
            id, lecture_id, mode, time_limit_seconds, now
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(id)
    }

    pub async fn complete_session(
        pool: &SqlitePool,
        session_id: &str,
        answers: Vec<QuizAnswer>,
    ) -> AppResult<QuizResult> {
        let now = Utc::now().timestamp_millis();

        let mut results = Vec::new();
        let mut correct_count = 0usize;

        for answer in &answers {
            let quiz_row = sqlx::query!(
                "SELECT answer_key FROM quizzes WHERE id = ?",
                answer.quiz_id
            )
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

            let correct_answer = quiz_row
                .map(|r| r.answer_key)
                .unwrap_or_default();

            let is_correct = answer.submitted_answer.trim().to_lowercase()
                == correct_answer.trim().to_lowercase();

            if is_correct {
                correct_count += 1;
            }

            // Record in quiz_attempts
            let attempt_id = Uuid::new_v4().to_string();
            let _ = sqlx::query!(
                "INSERT INTO quiz_attempts (id, quiz_id, submitted_answer, is_correct) \
                 VALUES (?, ?, ?, ?)",
                attempt_id, answer.quiz_id, answer.submitted_answer, is_correct
            )
            .execute(pool)
            .await;

            results.push(QuizAnswerResult {
                quiz_id: answer.quiz_id.clone(),
                submitted_answer: answer.submitted_answer.clone(),
                correct_answer,
                is_correct,
            });
        }

        let total = answers.len();
        let score_pct = if total > 0 {
            (correct_count as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let answers_json = serde_json::to_string(&results).unwrap_or_default();

        sqlx::query!(
            "UPDATE quiz_sessions SET completed_at = ?, score_pct = ?, answers_json = ? WHERE id = ?",
            now, score_pct, answers_json, session_id
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(QuizResult {
            session_id: session_id.to_string(),
            total,
            correct: correct_count,
            score_pct,
            answers: results,
        })
    }

    pub async fn list_sessions(pool: &SqlitePool, lecture_id: &str) -> AppResult<Vec<QuizSession>> {
        let rows = sqlx::query!(
            "SELECT id, lecture_id, mode, time_limit_seconds, started_at, completed_at, score_pct \
             FROM quiz_sessions WHERE lecture_id = ? ORDER BY started_at DESC",
            lecture_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(rows.into_iter().map(|r| QuizSession {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id.unwrap_or_default(),
            mode: r.mode,
            time_limit_seconds: r.time_limit_seconds,
            started_at: r.started_at,
            completed_at: r.completed_at,
            score_pct: r.score_pct,
        }).collect())
    }
}
