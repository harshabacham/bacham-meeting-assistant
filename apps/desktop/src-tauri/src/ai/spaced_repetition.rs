use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use crate::error::AppResult;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RevisionItem {
    pub id: String,
    pub item_type: String, // 'lecture' | 'concept' | 'flashcard' | 'quiz'
    pub item_id: String,
    pub lecture_id: Option<String>,
    pub title: String,
    pub next_review_at: i64,
    pub interval_days: i32,
    pub ease_factor: f64,
    pub repetition_count: i32,
    pub is_due: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpacedRepetitionQueue {
    pub due_today: Vec<RevisionItem>,
    pub due_tomorrow: Vec<RevisionItem>,
    pub due_this_week: Vec<RevisionItem>,
    pub upcoming: Vec<RevisionItem>,
}

pub struct SpacedRepetitionEngine;

impl SpacedRepetitionEngine {
    /// Update spaced repetition interval using SM-2 algorithm.
    /// rating: 0 (blackout), 1 (wrong), 2 (hard), 3 (good), 4 (easy), 5 (perfect)
    pub async fn review_item(
        item_type: &str,
        item_id: &str,
        lecture_id: Option<&str>,
        rating: u8,
        pool: &SqlitePool,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let existing = sqlx::query(
            "SELECT id, interval_days, ease_factor, repetition_count FROM spaced_repetition_schedule WHERE item_type = ? AND item_id = ?"
        )
        .bind(item_type)
        .bind(item_id)
        .fetch_optional(pool)
        .await?;

        let (id, mut interval, mut ease, mut reps) = if let Some(row) = existing {
            (row.get::<String, _>("id"), row.get::<i64, _>("interval_days") as i32, row.get::<f64, _>("ease_factor"), row.get::<i64, _>("repetition_count") as i32)
        } else {
            (Uuid::new_v4().to_string(), 1, 2.5, 0)
        };

        // SM-2 Calculation
        let q = rating.min(5) as f64;
        ease = (ease + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02))).max(1.3);

        if q < 3.0 {
            reps = 0;
            interval = 1;
        } else {
            reps += 1;
            interval = match reps {
                1 => 1,
                2 => 6,
                _ => (interval as f64 * ease).round() as i32,
            };
        }

        let next_review_at = now + (interval as i64 * 86_400_000);

        let _ = sqlx::query(
            "INSERT INTO spaced_repetition_schedule (id, item_type, item_id, lecture_id, next_review_at, interval_days, ease_factor, repetition_count, last_reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               next_review_at = EXCLUDED.next_review_at,
               interval_days = EXCLUDED.interval_days,
               ease_factor = EXCLUDED.ease_factor,
               repetition_count = EXCLUDED.repetition_count,
               last_reviewed_at = EXCLUDED.last_reviewed_at"
        )
        .bind(&id)
        .bind(item_type)
        .bind(item_id)
        .bind(lecture_id)
        .bind(next_review_at)
        .bind(interval)
        .bind(ease)
        .bind(reps)
        .bind(now)
        .execute(pool).await?;

        Ok(())
    }

    /// Retrieve full organized revision queue.
    pub async fn get_queue(pool: &SqlitePool) -> AppResult<SpacedRepetitionQueue> {
        let now = chrono::Utc::now().timestamp_millis();
        let one_day = 86_400_000;
        let seven_days = 7 * one_day;

        let rows = sqlx::query(
            "SELECT s.id, s.item_type, s.item_id, s.lecture_id, s.next_review_at, s.interval_days, s.ease_factor, s.repetition_count, l.title as lecture_title
             FROM spaced_repetition_schedule s
             LEFT JOIN lectures l ON s.lecture_id = l.id
             ORDER BY s.next_review_at ASC"
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        let mut due_today = Vec::new();
        let mut due_tomorrow = Vec::new();
        let mut due_this_week = Vec::new();
        let mut upcoming = Vec::new();

        for r in rows {
            let lecture_title: Option<String> = r.get("lecture_title");
            let item_type: String = r.get("item_type");
            let item_id: String = r.get("item_id");
            let next_review_at: i64 = r.get("next_review_at");

            let title = lecture_title.unwrap_or_else(|| format!("{} #{}", item_type, &item_id[..6.min(item_id.len())]));
            let is_due = next_review_at <= now;
            let item = RevisionItem {
                id: r.get("id"),
                item_type: item_type.clone(),
                item_id: item_id.clone(),
                lecture_id: r.get("lecture_id"),
                title,
                next_review_at,
                interval_days: r.get::<i64, _>("interval_days") as i32,
                ease_factor: r.get("ease_factor"),
                repetition_count: r.get::<i64, _>("repetition_count") as i32,
                is_due,
            };

            if next_review_at <= now + one_day {
                if is_due {
                    due_today.push(item);
                } else {
                    due_tomorrow.push(item);
                }
            } else if next_review_at <= now + seven_days {
                due_this_week.push(item);
            } else {
                upcoming.push(item);
            }
        }

        Ok(SpacedRepetitionQueue {
            due_today,
            due_tomorrow,
            due_this_week,
            upcoming,
        })
    }
}
