pub mod settings;
pub mod storage;
pub mod window;
pub mod native;
pub mod lectures;
pub mod folders;
pub mod folder_stats;
pub mod folder_notes;
pub mod content;
pub mod ai;
pub mod ocr;
pub mod search;
pub mod export;
pub mod dashboard;
pub mod artifacts;
pub mod timeline;
pub mod library;
pub mod flashcards;
pub mod quiz;
pub mod folder_transfer;
pub mod productivity;
pub mod collections;
pub mod organization;
pub mod batch;
pub mod undo;
pub mod capture;
pub mod integrations;
pub mod interview_copilot;
pub mod markdown_export;
pub mod decision_tracker;
use serde::Serialize;
use crate::error::AppResult;
use crate::database::DbState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbHealth {
    pub ok: bool,
    pub migration_version: i64,
}

#[tauri::command]
pub async fn db_health_check(app: tauri::AppHandle) -> AppResult<DbHealth> {
    use sqlx::Row;
    use tauri::Manager;
    
    // If DbState isn't managed yet (DB still initializing), don't panic. Just return not OK.
    let state = match app.try_state::<DbState>() {
        Some(s) => s,
        None => return Ok(DbHealth { ok: false, migration_version: 0 }),
    };

    let row = sqlx::query("SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1")
        .fetch_optional(&state.pool)
        .await?;

    let version = if let Some(r) = row {
        r.get::<i64, _>("version")
    } else {
        0
    };

    Ok(DbHealth {
        ok: true,
        migration_version: version,
    })
}

#[derive(serde::Deserialize)]
pub struct LogInput {
    pub level: String,
    pub module: String,
    pub message: String,
}

#[tauri::command]
pub async fn logger_write(input: LogInput, app: tauri::AppHandle) -> AppResult<()> {
    use tauri::Manager;
    let docs = app.path().document_dir().unwrap();
    let logs_dir = docs.join("BACHAM").join("Logs");
    crate::logger::write_log(&logs_dir, &input.level, &input.module, &input.message);
    Ok(())
}
pub mod chat;
pub mod study_actions;
pub mod prompts;
pub mod patterns;
pub mod providers;
pub mod workspace_notes;
