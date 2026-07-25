use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use uuid::Uuid;


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub id: String,
    pub lecture_id: String,
    pub event_type: String,
    pub timestamp_ms: i64,
    pub label: String,
    pub screenshot_id: Option<String>,
}

pub struct TimelineService;

impl TimelineService {
    pub async fn insert_event(
        pool: &SqlitePool,
        lecture_id: &str,
        event_type: &str,
        timestamp_ms: i64,
        label: &str,
        screenshot_id: Option<&str>,
    ) -> AppResult<String> {
        let id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO timeline_events (id, lecture_id, event_type, timestamp_ms, label, screenshot_id) \
             VALUES (?, ?, ?, ?, ?, ?)",
            id, lecture_id, event_type, timestamp_ms, label, screenshot_id
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(id)
    }

    pub async fn get_for_lecture(pool: &SqlitePool, lecture_id: &str) -> AppResult<Vec<TimelineEvent>> {
        let rows = sqlx::query!(
            "SELECT id, lecture_id, event_type, timestamp_ms, label, screenshot_id \
             FROM timeline_events WHERE lecture_id = ? ORDER BY timestamp_ms ASC",
            lecture_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(rows.into_iter().map(|r| TimelineEvent {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id,
            event_type: r.event_type,
            timestamp_ms: r.timestamp_ms,
            label: r.label,
            screenshot_id: r.screenshot_id,
        }).collect())
    }

    /// Populate slide/code/formula events from key frames' change_reason.
    /// Called after screenshots are processed — uses captured_at as timestamp.
    pub async fn populate_from_key_frames(pool: &SqlitePool, lecture_id: &str) -> AppResult<()> {
        let frames = sqlx::query!(
            "SELECT id, captured_at, change_reason FROM screenshots \
             WHERE lecture_id = ? AND is_key_frame = 1 AND change_reason IS NOT NULL \
             ORDER BY captured_at ASC",
            lecture_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        for frame in frames {
            let reason = frame.change_reason.unwrap_or_else(|| "slide_change".into());
            let label = match reason.as_str() {
                "code_appeared" => "Code on screen",
                "formula_appeared" => "Formula on screen",
                _ => "Slide change",
            };
            let screenshot_id = frame.id.as_deref();
            // Avoid inserting duplicate events
            let existing = sqlx::query!(
                "SELECT id FROM timeline_events \
                 WHERE lecture_id = ? AND screenshot_id = ? AND event_type = ?",
                lecture_id, screenshot_id, reason
            )
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

            if existing.is_none() {
                let _ = Self::insert_event(
                    pool,
                    lecture_id,
                    &reason,
                    frame.captured_at,
                    label,
                    screenshot_id,
                ).await;
            }
        }
        Ok(())
    }

    /// Extract ai_insight events from summary/chapter_breakdown content_json.
    /// The intelligence engine emits JSON with an "ai_insights" array.
    pub async fn extract_and_insert_ai_events(
        pool: &SqlitePool,
        lecture_id: &str,
        content_json: &str,
    ) -> AppResult<()> {
        let val: serde_json::Value = match serde_json::from_str(content_json) {
            Ok(v) => v,
            Err(_) => return Ok(()),
        };

        if let Some(insights) = val.get("ai_insights").and_then(|v| v.as_array()) {
            for insight in insights {
                let label = insight["label"].as_str().unwrap_or("Key moment");
                // timestamp_hint is a text description, not a real ms value —
                // we store it as a pseudo-timestamp at 0 (user can still see the label)
                let ts: i64 = 0;
                let _ = Self::insert_event(pool, lecture_id, "ai_insight", ts, label, None).await;
            }
        }
        Ok(())
    }

    /// Add a bookmark as a timeline event (mirrors bookmarks table).
    pub async fn add_bookmark_event(
        pool: &SqlitePool,
        lecture_id: &str,
        timestamp_ms: i64,
        label: &str,
    ) -> AppResult<String> {
        Self::insert_event(pool, lecture_id, "bookmark", timestamp_ms, label, None).await
    }
}
