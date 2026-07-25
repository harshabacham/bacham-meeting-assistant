use tauri::{State, Manager, AppHandle};
use serde::Serialize;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::lecture_service::Lecture;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub recent_lectures: Vec<Lecture>,
    pub pinned_lectures: Vec<Lecture>,
    pub continue_learning: Option<Lecture>,
    pub today_activity_count: i64,
    pub storage_used_bytes: u64,
}

fn get_dir_size(path: impl AsRef<std::path::Path>) -> std::io::Result<u64> {
    let mut size = 0;
    if path.as_ref().is_dir() {
        for entry in std::fs::read_dir(&path)? {
            let entry = entry?;
            let meta = entry.metadata()?;
            if meta.is_dir() {
                size += get_dir_size(entry.path())?;
            } else {
                size += meta.len();
            }
        }
    }
    Ok(size)
}

#[tauri::command]
pub async fn dashboard_summary(state: State<'_, DbState>, app_handle: AppHandle) -> AppResult<DashboardSummary> {
    let all = crate::services::lecture_service::LectureService::list_lectures(&state.pool).await?;
    let pinned: Vec<Lecture> = all.iter().filter(|l| l.is_pinned).cloned().collect();
    
    let continue_learning = all.first().cloned();
    
    // Calculate real storage size
    let mut storage_used_bytes = 0;
    if let Ok(docs) = app_handle.path().document_dir() {
        let bacham_dir = docs.join("BACHAM");
        if bacham_dir.exists() {
            storage_used_bytes = get_dir_size(&bacham_dir).unwrap_or(0);
        }
    }
    
    // Today's activity count (lectures created today)
    let today = chrono::Utc::now().date_naive();
    let today_activity_count = all.iter().filter(|l| {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&l.created_at) {
            dt.date_naive() == today
        } else {
            false
        }
    }).count() as i64;
    
    Ok(DashboardSummary {
        recent_lectures: all.into_iter().take(5).collect(),
        pinned_lectures: pinned,
        continue_learning,
        today_activity_count,
        storage_used_bytes,
    })
}
