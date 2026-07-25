use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::artifact_service::{ArtifactService, LectureArtifact, ArtifactMeta};
use crate::ai::intelligence_engine::IntelligenceEngine;

#[tauri::command]
pub async fn artifacts_get(
    lecture_id: String,
    artifact_type: String,
    state: State<'_, DbState>,
) -> AppResult<Option<LectureArtifact>> {
    ArtifactService::get_latest(&state.pool, &lecture_id, &artifact_type).await
}

#[tauri::command]
pub async fn artifacts_list(
    lecture_id: String,
    state: State<'_, DbState>,
) -> AppResult<Vec<ArtifactMeta>> {
    ArtifactService::list_for_lecture(&state.pool, &lecture_id).await
}

#[tauri::command]
pub async fn artifacts_regenerate(
    lecture_id: String,
    artifact_type: String,
    state: State<'_, DbState>,
) -> AppResult<String> {
    IntelligenceEngine::regenerate_artifact(&state.pool, &lecture_id, &artifact_type).await
}
