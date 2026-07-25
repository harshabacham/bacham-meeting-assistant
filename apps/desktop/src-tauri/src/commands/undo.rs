use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;

#[derive(Serialize, Deserialize)]
pub struct UndoResult {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ActionSummary {
    pub id: String,
    pub action_type: String,
    pub expires_at: String,
}

#[tauri::command]
pub async fn undo_last_action(_state: State<'_, DbState>) -> AppResult<UndoResult> {
    unimplemented!()
}

#[tauri::command]
pub async fn get_undoable_action(_state: State<'_, DbState>) -> AppResult<Option<ActionSummary>> {
    unimplemented!()
}
