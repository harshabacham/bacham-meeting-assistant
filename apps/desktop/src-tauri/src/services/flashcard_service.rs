use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use crate::error::{AppResult, AppError};
use uuid::Uuid;
use chrono::Utc;

/// SM-2 Spaced Repetition implementation.
/// Rating 0-5: 0=complete blackout, 3=correct with difficulty, 5=perfect.
/// Ratings below 3 reset the interval to 1 day.
const MIN_EASE_FACTOR: f64 = 1.3;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Flashcard {
    pub id: String,
    pub lecture_id: String,
    pub question: String,
    pub answer: String,
    pub difficulty: String,
    pub ease_factor: f64,
    pub interval_days: i64,
    pub next_review_at: Option<i64>,
    pub created_at: String,
    pub last_reviewed_at: Option<String>,
}

pub struct FlashcardService;

impl FlashcardService {
    pub async fn generate_flashcards(pool: &SqlitePool, lecture_id: &str, transcript: &str) -> AppResult<()> {
        let instruction = "Generate comprehensive flashcards from the lecture. \
            Return a JSON array of objects with 'question', 'answer', and 'difficulty' \
            (easy/medium/hard) fields. Generate 10-20 cards covering key concepts.";
        let content = crate::services::gemini_service::GeminiService::generate_text(transcript, instruction, pool).await?;
        
        let clean_json = content
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();
        
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(clean_json) {
            if let Some(arr) = json.as_array() {
                for item in arr {
                    let q = item["question"].as_str().unwrap_or_default();
                    let a = item["answer"].as_str().unwrap_or_default();
                    let diff = item["difficulty"].as_str().unwrap_or("medium");
                    if q.is_empty() || a.is_empty() { continue; }
                    let id = Uuid::new_v4().to_string();
                    sqlx::query!(
                        "INSERT INTO flashcards (id, lecture_id, question, answer, difficulty, ease_factor, interval_days) \
                         VALUES (?, ?, ?, ?, ?, 2.5, 1)",
                        id, lecture_id, q, a, diff
                    ).execute(pool).await?;
                }
            }
        }
        Ok(())
    }

    /// SM-2 algorithm: update scheduling after a review.
    /// rating: 0 = complete blackout, 1 = wrong, 2 = barely, 3 = correct w/ difficulty,
    ///         4 = correct w/ hesitation, 5 = perfect
    pub async fn review_flashcard(pool: &SqlitePool, id: &str, rating: u8) -> AppResult<Flashcard> {
        let row = sqlx::query!(
            "SELECT ease_factor, interval_days FROM flashcards WHERE id = ?",
            id
        )
        .fetch_one(pool)
        .await?;

        let ease_factor: f64 = row.ease_factor.unwrap_or(2.5);
        let interval_days: i64 = row.interval_days.unwrap_or(1);

        // SM-2 formula
        let new_ease = (ease_factor + (0.1 - (5.0 - rating as f64) * (0.08 + (5.0 - rating as f64) * 0.02)))
            .max(MIN_EASE_FACTOR);

        let (new_interval, next_ease) = if rating < 3 {
            // Failed recall: reset to 1 day, ease decreases
            (1i64, (ease_factor - 0.2).max(MIN_EASE_FACTOR))
        } else if interval_days == 1 {
            (6i64, new_ease)
        } else {
            ((interval_days as f64 * ease_factor).round() as i64, new_ease)
        };

        let now_ms = Utc::now().timestamp_millis();
        let next_review_ms = now_ms + (new_interval * 24 * 3600 * 1000);
        let now_str = Utc::now().to_rfc3339();

        sqlx::query!(
            "UPDATE flashcards SET ease_factor = ?, interval_days = ?, next_review_at = ?, \
             last_reviewed_at = ? WHERE id = ?",
            next_ease, new_interval, next_review_ms, now_str, id
        )
        .execute(pool)
        .await?;

        Self::get_flashcard(pool, id).await?
            .ok_or_else(|| AppError::Internal("Flashcard not found after update".into()))
    }

    pub async fn get_flashcard(pool: &SqlitePool, id: &str) -> AppResult<Option<Flashcard>> {
        let row = sqlx::query!(
            "SELECT id, lecture_id, question, answer, difficulty, ease_factor, interval_days, \
             next_review_at, created_at, last_reviewed_at FROM flashcards WHERE id = ?",
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| Flashcard {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id.unwrap_or_default(),
            question: r.question,
            answer: r.answer,
            difficulty: r.difficulty.unwrap_or_else(|| "medium".into()),
            ease_factor: r.ease_factor.unwrap_or(2.5),
            interval_days: r.interval_days.unwrap_or(1),
            next_review_at: r.next_review_at,
            created_at: r.created_at.map(|d| d.to_string()).unwrap_or_default(),
            last_reviewed_at: r.last_reviewed_at.map(|d| d.to_string()),
        }))
    }

    pub async fn list_flashcards(pool: &SqlitePool, lecture_id: &str) -> AppResult<Vec<Flashcard>> {
        let rows = sqlx::query!(
            "SELECT id, lecture_id, question, answer, difficulty, ease_factor, interval_days, \
             next_review_at, created_at, last_reviewed_at \
             FROM flashcards WHERE lecture_id = ? ORDER BY created_at ASC",
            lecture_id
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|r| Flashcard {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id.unwrap_or_default(),
            question: r.question,
            answer: r.answer,
            difficulty: r.difficulty.unwrap_or_else(|| "medium".into()),
            ease_factor: r.ease_factor.unwrap_or(2.5),
            interval_days: r.interval_days.unwrap_or(1),
            next_review_at: r.next_review_at,
            created_at: r.created_at.map(|d| d.to_string()).unwrap_or_default(),
            last_reviewed_at: r.last_reviewed_at.map(|d| d.to_string()),
        }).collect())
    }

    pub async fn get_due_flashcards(pool: &SqlitePool, lecture_id: Option<&str>) -> AppResult<Vec<Flashcard>> {
        let now_ms = Utc::now().timestamp_millis();
        if let Some(lid) = lecture_id {
            let rows = sqlx::query!(
                "SELECT id, lecture_id, question, answer, difficulty, ease_factor, interval_days, \
                 next_review_at, created_at, last_reviewed_at \
                 FROM flashcards \
                 WHERE lecture_id = ? AND (next_review_at IS NULL OR next_review_at <= ?) \
                 ORDER BY next_review_at ASC NULLS FIRST",
                lid, now_ms
            )
            .fetch_all(pool)
            .await?;
            
            Ok(rows.into_iter().map(|r| Flashcard {
                id: r.id.unwrap_or_default(),
                lecture_id: r.lecture_id.unwrap_or_default(),
                question: r.question,
                answer: r.answer,
                difficulty: r.difficulty.unwrap_or_else(|| "medium".into()),
                ease_factor: r.ease_factor.unwrap_or(2.5),
                interval_days: r.interval_days.unwrap_or(1),
                next_review_at: r.next_review_at,
                created_at: r.created_at.map(|d| d.to_string()).unwrap_or_default(),
                last_reviewed_at: r.last_reviewed_at.map(|d| d.to_string()),
            }).collect())
        } else {
            let rows = sqlx::query!(
                "SELECT id, lecture_id, question, answer, difficulty, ease_factor, interval_days, \
                 next_review_at, created_at, last_reviewed_at \
                 FROM flashcards \
                 WHERE next_review_at IS NULL OR next_review_at <= ? \
                 ORDER BY next_review_at ASC NULLS FIRST",
                now_ms
            )
            .fetch_all(pool)
            .await?;
            
            Ok(rows.into_iter().map(|r| Flashcard {
                id: r.id.unwrap_or_default(),
                lecture_id: r.lecture_id.unwrap_or_default(),
                question: r.question,
                answer: r.answer,
                difficulty: r.difficulty.unwrap_or_else(|| "medium".into()),
                ease_factor: r.ease_factor.unwrap_or(2.5),
                interval_days: r.interval_days.unwrap_or(1),
                next_review_at: r.next_review_at,
                created_at: r.created_at.map(|d| d.to_string()).unwrap_or_default(),
                last_reviewed_at: r.last_reviewed_at.map(|d| d.to_string()),
            }).collect())
        }
    }

    pub async fn create_flashcard(pool: &SqlitePool, lecture_id: &str, question: &str, answer: &str, difficulty: &str) -> AppResult<Flashcard> {
        let id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO flashcards (id, lecture_id, question, answer, difficulty, ease_factor, interval_days) \
             VALUES (?, ?, ?, ?, ?, 2.5, 1)",
            id, lecture_id, question, answer, difficulty
        ).execute(pool).await?;

        Self::get_flashcard(pool, &id).await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created flashcard".into()))
    }

    pub async fn update_flashcard(pool: &SqlitePool, id: &str, question: &str, answer: &str) -> AppResult<Flashcard> {
        sqlx::query!(
            "UPDATE flashcards SET question = ?, answer = ? WHERE id = ?",
            question, answer, id
        ).execute(pool).await?;

        Self::get_flashcard(pool, id).await?
            .ok_or_else(|| AppError::Internal("Flashcard not found".into()))
    }

    pub async fn delete_flashcard(pool: &SqlitePool, id: &str) -> AppResult<()> {
        sqlx::query!("DELETE FROM flashcards WHERE id = ?", id).execute(pool).await?;
        Ok(())
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    fn sm2_simulate(ease: f64, interval: i64, rating: u8) -> (f64, i64) {
        let new_ease = (ease + (0.1 - (5.0 - rating as f64) * (0.08 + (5.0 - rating as f64) * 0.02)))
            .max(MIN_EASE_FACTOR);

        if rating < 3 {
            return ((ease - 0.2).max(MIN_EASE_FACTOR), 1);
        }
        if interval == 1 {
            return (new_ease, 6);
        }
        ((ease + 0.0), (interval as f64 * ease).round() as i64) // simplified
    }

    #[test]
    fn sm2_perfect_recall_increases_ease() {
        let (new_ease, new_interval) = sm2_simulate(2.5, 1, 5);
        assert!(new_ease >= 2.5, "Ease should not decrease on perfect recall");
        assert!(new_interval >= 6, "Interval should be at least 6 days after first success");
    }

    #[test]
    fn sm2_failed_recall_resets_interval() {
        let (_, new_interval) = sm2_simulate(2.5, 20, 0);
        assert_eq!(new_interval, 1, "Failed recall must reset to 1 day");
    }

    #[test]
    fn sm2_ease_never_below_minimum() {
        let mut ease = 2.5f64;
        for _ in 0..10 {
            let (new_ease, _) = sm2_simulate(ease, 1, 0);
            ease = new_ease;
        }
        assert!(ease >= MIN_EASE_FACTOR, "Ease factor must never drop below {MIN_EASE_FACTOR}");
    }
}
