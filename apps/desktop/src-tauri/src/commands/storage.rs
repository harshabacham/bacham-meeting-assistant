use tauri::{AppHandle, Manager, State};
use serde::Deserialize;
use std::path::PathBuf;
use crate::error::AppResult;
use crate::database::DbState;
use crate::storage::{StorageLayout, initialize_layout, move_storage};
use sqlx::Row;

#[tauri::command]
pub async fn storage_get_layout(app: AppHandle, state: State<'_, DbState>) -> AppResult<StorageLayout> {
    let pool = &state.pool;
    
    let storage_row = sqlx::query("SELECT value FROM settings WHERE key = 'storage_root_path'").fetch_optional(pool).await?;
    let storage_root_path = storage_row.map(|r| r.get("value")).unwrap_or_else(|| {
        app.path().document_dir().unwrap().join("BACHAM").to_string_lossy().to_string()
    });

    let layout = initialize_layout(PathBuf::from(storage_root_path))?;
    Ok(layout)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeLocationInput {
    pub new_path: String,
}

#[tauri::command]
pub async fn storage_change_location(app: AppHandle, input: ChangeLocationInput, state: State<'_, DbState>) -> AppResult<StorageLayout> {
    let pool = &state.pool;
    
    let storage_row = sqlx::query("SELECT value FROM settings WHERE key = 'storage_root_path'").fetch_optional(pool).await?;
    let old_path_str = storage_row.map(|r| r.get::<String, _>("value")).unwrap_or_else(|| {
        app.path().document_dir().unwrap().join("BACHAM").to_string_lossy().to_string()
    });

    let old_root = PathBuf::from(&old_path_str);
    let new_root = PathBuf::from(&input.new_path);

    if old_root != new_root {
        move_storage(&old_root, &new_root)?;
        
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('storage_root_path', ?)")
            .bind(&input.new_path)
            .execute(pool).await?;
    }
    
    let layout = initialize_layout(new_root)?;
    Ok(layout)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageBreakdown {
    pub database_bytes: u64,
    pub videos_bytes: u64,
    pub logs_bytes: u64,
    pub other_bytes: u64,
    pub total_bytes: u64,
}

fn dir_size(path: &PathBuf) -> u64 {
    let mut size = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    size += dir_size(&entry.path());
                } else {
                    size += meta.len();
                }
            }
        }
    }
    size
}

#[tauri::command]
pub async fn storage_get_breakdown(app: AppHandle, state: State<'_, DbState>) -> AppResult<StorageBreakdown> {
    let layout = storage_get_layout(app.clone(), state.clone()).await?;
    let pool = &state.pool;

    // Database size
    let db_path = layout.data.join("bacham.db");
    let database_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

    // Logs size
    let logs_bytes = dir_size(&layout.logs);

    // Videos size
    let mut videos_bytes = 0;
    let video_rows = sqlx::query("SELECT video_path FROM lectures WHERE video_path IS NOT NULL AND deleted_at IS NULL")
        .fetch_all(pool)
        .await?;

    for row in video_rows {
        let vp: Option<String> = row.try_get("video_path").unwrap_or(None);
        if let Some(path_str) = vp {
            let path = PathBuf::from(path_str);
            if let Ok(meta) = std::fs::metadata(&path) {
                videos_bytes += meta.len();
            }
        }
    }

    // Other bytes
    let total_data_dir = dir_size(&layout.data);
    let other_bytes = total_data_dir.saturating_sub(database_bytes).saturating_sub(videos_bytes); // Approximate if videos are inside data dir, though they might not be. Actually, total_bytes should be everything.
    
    let total_bytes = database_bytes + videos_bytes + logs_bytes + other_bytes;

    Ok(StorageBreakdown {
        database_bytes,
        videos_bytes,
        logs_bytes,
        other_bytes,
        total_bytes,
    })
}

#[tauri::command]
pub async fn storage_delete_video(id: String, state: State<'_, DbState>) -> AppResult<()> {
    let pool = &state.pool;
    
    // Get path
    let row = sqlx::query("SELECT video_path FROM lectures WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool)
        .await?;

    if let Some(r) = row {
        let vp: Option<String> = r.try_get("video_path").unwrap_or(None);
        if let Some(path_str) = vp {
            let path = PathBuf::from(path_str);
            if path.exists() {
                std::fs::remove_file(path).unwrap_or_else(|e| eprintln!("Failed to delete video file: {}", e));
            }
            
            // Set null
            sqlx::query("UPDATE lectures SET video_path = NULL WHERE id = ?")
                .bind(&id)
                .execute(pool)
                .await?;
        }
    }

    Ok(())
}
