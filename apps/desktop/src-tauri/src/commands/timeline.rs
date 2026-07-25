use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::timeline_service::{TimelineService, TimelineEvent};

#[tauri::command]
pub async fn timeline_get(
    lecture_id: String,
    state: State<'_, DbState>,
) -> AppResult<Vec<TimelineEvent>> {
    TimelineService::get_for_lecture(&state.pool, &lecture_id).await
}

#[tauri::command]
pub async fn timeline_add_bookmark(
    lecture_id: String,
    timestamp_ms: i64,
    label: String,
    state: State<'_, DbState>,
) -> AppResult<String> {
    // Add to bookmarks table (existing)
    let bookmark_id = uuid::Uuid::new_v4().to_string();
    sqlx::query!(
        "INSERT INTO bookmarks (id, lecture_id, timestamp_ms, label) VALUES (?, ?, ?, ?)",
        bookmark_id, lecture_id, timestamp_ms, label
    )
    .execute(&state.pool)
    .await?;

    // Mirror to timeline_events
    TimelineService::add_bookmark_event(&state.pool, &lecture_id, timestamp_ms, &label).await
}
