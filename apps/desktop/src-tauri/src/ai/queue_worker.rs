use sqlx::SqlitePool;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use chrono::Utc;

use crate::error::AppError;

pub struct QueueWorker;

impl QueueWorker {
    pub fn spawn(app: AppHandle, pool: SqlitePool) {
        // Reset any orphaned 'running' jobs from a previous crashed session back to 'pending'
        let pool_clone = pool.clone();
        tauri::async_runtime::spawn(async move {
            let _ = sqlx::query("UPDATE ai_jobs SET status = 'pending' WHERE status = 'running'")
                .execute(&pool_clone).await;
        });

        tauri::async_runtime::spawn(async move {
            loop {
                // Sleep for 5 seconds between polls
                tokio::time::sleep(Duration::from_secs(5)).await;
                
                if let Err(e) = Self::process_next_job(&app, &pool).await {
                    eprintln!("[QueueWorker] Error processing job: {}", e);
                }
            }
        });
    }

    async fn process_next_job(app: &AppHandle, pool: &SqlitePool) -> Result<(), AppError> {
        // Find a job ready to run
        // Use a transaction to lock the row? SQLite doesn't have FOR UPDATE SKIP LOCKED,
        // but we only have one worker thread anyway.
        
        let now = Utc::now().to_rfc3339();
        
        let row_opt = sqlx::query(
            r#"
            SELECT id, lecture_id, job_type, status, payload_json, attempt_count, max_attempts
            FROM ai_jobs 
            WHERE status IN ('pending', 'retry_scheduled', 'waiting_for_quota')
              AND (next_retry_at IS NULL OR next_retry_at <= ?)
            ORDER BY created_at ASC
            LIMIT 1
            "#,
        )
        .bind(&now)
        .fetch_optional(pool)
        .await?;

        if let Some(row) = row_opt {
            let id: String = sqlx::Row::get(&row, "id");
            let lecture_id: String = sqlx::Row::get(&row, "lecture_id");
            let job_type: String = sqlx::Row::get(&row, "job_type");
            let attempt_count: i32 = sqlx::Row::get(&row, "attempt_count");
            let max_attempts: Option<i32> = sqlx::Row::get(&row, "max_attempts");

            // Mark as running
            sqlx::query(
                "UPDATE ai_jobs SET status = 'running', updated_at = ? WHERE id = ?",
            )
            .bind(&now)
            .bind(&id)
            .execute(pool)
            .await?;

            eprintln!("[QueueWorker] Processing job {} for lecture {}", job_type, lecture_id);

            // Dispatch based on job type
            let result = match job_type.as_str() {
                "lecture_intelligence" => crate::ai::intelligence_engine::IntelligenceEngine::execute_job(app, &lecture_id, pool).await,
                _ => Err(AppError::Internal(format!("Unknown job type: {}", job_type))),
            };

            let now_end = Utc::now().to_rfc3339();

            match result {
                Ok(_) => {
                    sqlx::query(
                        "UPDATE ai_jobs SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
                    )
                    .bind(&now_end)
                    .bind(&now_end)
                    .bind(&id)
                    .execute(pool)
                    .await?;
                }
                Err(AppError::RateLimit(delay_secs)) => {
                    // Gemini returned 429
                    let delay = if delay_secs > 0 { delay_secs } else { 60 };
                    let next_retry = Utc::now() + chrono::Duration::seconds(delay as i64);
                    let next_retry_str = next_retry.to_rfc3339();
                    
                    sqlx::query(
                        "UPDATE ai_jobs SET status = 'waiting_for_quota', next_retry_at = ?, updated_at = ?, last_error = 'Rate limit exceeded' WHERE id = ?",
                    )
                    .bind(&next_retry_str)
                    .bind(&now_end)
                    .bind(&id)
                    .execute(pool)
                    .await?;

                    let _ = app.emit("artifact_progress", serde_json::json!({
                        "lectureId": lecture_id,
                        "artifactType": "lecture_intelligence",
                        "status": "waiting_for_quota",
                        "error": format!("Rate limited. Retrying at {}", next_retry_str)
                    }));
                }
                Err(e) => {
                    let new_attempt = attempt_count + 1;
                    if new_attempt >= max_attempts.unwrap_or(5) {
                        sqlx::query(
                            "UPDATE ai_jobs SET status = 'failed', updated_at = ?, last_error = ? WHERE id = ?",
                        )
                        .bind(&now_end)
                        .bind(e.to_string())
                        .bind(&id)
                        .execute(pool)
                        .await?;

                        let _ = app.emit("artifact_progress", serde_json::json!({
                            "lectureId": lecture_id,
                            "artifactType": "lecture_intelligence",
                            "status": "failed",
                            "error": e.to_string()
                        }));
                    } else {
                        // Exponential backoff
                        let base_delay = 30; // seconds
                        let backoff = base_delay * (1 << (new_attempt - 1));
                        let total_delay = std::cmp::min(backoff, 3600); // max 1 hour
                        
                        let next_retry = Utc::now() + chrono::Duration::seconds(total_delay as i64);
                        let next_retry_str = next_retry.to_rfc3339();

                        sqlx::query(
                            "UPDATE ai_jobs SET status = 'retry_scheduled', attempt_count = ?, next_retry_at = ?, updated_at = ?, last_error = ? WHERE id = ?",
                        )
                        .bind(new_attempt)
                        .bind(&next_retry_str)
                        .bind(&now_end)
                        .bind(e.to_string())
                        .bind(&id)
                        .execute(pool)
                        .await?;

                        let _ = app.emit("artifact_progress", serde_json::json!({
                            "lectureId": lecture_id,
                            "artifactType": "lecture_intelligence",
                            "status": "retry_scheduled",
                            "error": format!("Failed: {}. Retrying at {}", e, next_retry_str)
                        }));
                    }
                }
            }
        }
        
        Ok(())
    }
}
