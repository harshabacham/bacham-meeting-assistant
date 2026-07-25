use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use crate::error::AppResult;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionState {
    pub lecture_id: String,
    pub video_timestamp_ms: i64,
    pub active_tab: String,
    pub scroll_position: f64,
    pub open_note_id: Option<String>,
    pub workspace_layout_json: Option<String>,
    pub updated_at: i64,
}

pub struct SessionMemory;
pub type SessionMemoryEngine = SessionMemory;

impl SessionMemory {
    pub async fn save_session(
        state: &SessionState,
        pool: &SqlitePool,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        
        let _ = sqlx::query(
            "INSERT INTO study_sessions (lecture_id, video_timestamp_ms, active_tab, scroll_position, open_note_id, workspace_layout_json, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(lecture_id) DO UPDATE SET
               video_timestamp_ms = excluded.video_timestamp_ms,
               active_tab = excluded.active_tab,
               scroll_position = excluded.scroll_position,
               open_note_id = excluded.open_note_id,
               workspace_layout_json = excluded.workspace_layout_json,
               updated_at = excluded.updated_at"
        )
        .bind(&state.lecture_id)
        .bind(state.video_timestamp_ms)
        .bind(&state.active_tab)
        .bind(state.scroll_position)
        .bind(&state.open_note_id)
        .bind(&state.workspace_layout_json)
        .bind(now)
        .execute(pool).await;

        // Also update last_opened_at in lectures table
        let date_str = chrono::Utc::now().to_rfc3339();
        let _ = sqlx::query("UPDATE lectures SET updated_at = ? WHERE id = ?")
            .bind(&date_str)
            .bind(&state.lecture_id)
            .execute(pool).await;

        // Log silent learning event
        let event_id = uuid::Uuid::new_v4().to_string();
        let _ = sqlx::query(
            "INSERT INTO learning_events (id, lecture_id, event_type, duration_ms, created_at) VALUES (?, ?, 'lecture_open', 0, ?)"
        )
        .bind(event_id)
        .bind(&state.lecture_id)
        .bind(now)
        .execute(pool).await;

        Ok(())
    }

    pub async fn get_session(
        lecture_id: &str,
        pool: &SqlitePool,
    ) -> AppResult<Option<SessionState>> {
        let row = sqlx::query(
            "SELECT lecture_id, video_timestamp_ms, active_tab, scroll_position, open_note_id, workspace_layout_json, updated_at
             FROM study_sessions WHERE lecture_id = ?"
        )
        .bind(lecture_id)
        .fetch_optional(pool)
        .await?;

        if let Some(r) = row {
            Ok(Some(SessionState {
                lecture_id: r.get("lecture_id"),
                video_timestamp_ms: r.get("video_timestamp_ms"),
                active_tab: r.get("active_tab"),
                scroll_position: r.get("scroll_position"),
                open_note_id: r.get("open_note_id"),
                workspace_layout_json: r.get("workspace_layout_json"),
                updated_at: r.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }
}
