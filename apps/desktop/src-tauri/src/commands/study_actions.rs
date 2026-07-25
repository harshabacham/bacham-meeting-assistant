use tauri::{AppHandle, Manager};
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::study_action_service::{StudyActionService, StudyActionType, StudyActionRun};
use crate::ai::context_engine::ChatScope;

#[tauri::command]
pub async fn run_study_action(
    app: AppHandle,
    action: StudyActionType,
    scope: ChatScope
) -> AppResult<StudyActionRun> {
    StudyActionService::run_action(&app, action, &scope).await
}

#[tauri::command]
pub async fn get_study_action_status(
    app: AppHandle,
    run_id: String
) -> AppResult<StudyActionRun> {
    let pool = &app.state::<DbState>().pool;
    StudyActionService::get_status(pool, &run_id).await
}
