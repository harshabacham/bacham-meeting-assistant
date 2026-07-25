use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;
use crate::commands::organization::BatchResult;

#[derive(Deserialize)]
pub struct BatchMetadataInput {
    pub lecture_ids: Vec<String>,
    pub subject: Option<String>,
    pub semester: Option<String>,
    pub teacher: Option<String>,
    pub tags_to_add: Option<Vec<String>>,
    pub tags_to_remove: Option<Vec<String>>,
    pub collections_to_add: Option<Vec<String>>,
    pub collections_to_remove: Option<Vec<String>>,
    pub folder_id: Option<String>,
    pub append_notes: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub enum GenerationKind {
    Summary,
    Flashcards,
    Quiz,
}

#[derive(Serialize, Deserialize)]
pub struct BatchJobHandle {
    pub job_id: String,
}

#[derive(Deserialize)]
pub struct ExportIncludeOptions {
    pub transcript: bool,
    pub summary: bool,
    pub flashcards: bool,
    pub quiz: bool,
    pub notes: bool,
    pub screenshots: bool,
    pub timeline: bool,
    pub metadata: bool,
}

#[derive(Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn batch_assign_metadata(_state: State<'_, DbState>, _input: BatchMetadataInput) -> AppResult<BatchResult> {
    unimplemented!()
}

#[tauri::command]
pub async fn batch_generate(_state: State<'_, DbState>, _lecture_ids: Vec<String>, _kind: GenerationKind) -> AppResult<BatchJobHandle> {
    unimplemented!()
}

#[tauri::command]
pub async fn batch_export(_state: State<'_, DbState>, _lecture_ids: Vec<String>, _format: String, _include: ExportIncludeOptions) -> AppResult<ExportResult> {
    unimplemented!()
}
