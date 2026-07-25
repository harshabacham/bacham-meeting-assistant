use tauri::State;
use serde::Serialize;
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use chrono::Utc;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentlyViewed {
    pub lecture_id: String,
    pub viewed_at: i64,
    pub title: Option<String>,
}

#[tauri::command]
pub async fn recently_viewed_list(state: State<'_, DbState>) -> AppResult<Vec<RecentlyViewed>> {
    let rows = sqlx::query!(
        "SELECT rv.lecture_id, rv.viewed_at, l.title \
         FROM recently_viewed rv \
         LEFT JOIN lectures l ON l.id = rv.lecture_id \
         WHERE l.deleted_at IS NULL \
         ORDER BY rv.viewed_at DESC LIMIT 20"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(rows.into_iter().map(|r| RecentlyViewed {
        lecture_id: r.lecture_id.unwrap_or_default(),
        viewed_at: r.viewed_at,
        title: r.title,
    }).collect())
}

#[tauri::command]
pub async fn recently_viewed_add(lecture_id: String, state: State<'_, DbState>) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    sqlx::query!(
        "INSERT OR REPLACE INTO recently_viewed (lecture_id, viewed_at) VALUES (?, ?)",
        lecture_id, now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}
