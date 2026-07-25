use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::prompt_service::{PromptService, SavedPrompt};

#[tauri::command]
pub async fn list_prompts(state: State<'_, DbState>) -> AppResult<Vec<SavedPrompt>> {
    PromptService::list_prompts(&state.pool).await
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePromptInput {
    pub name: String,
    pub body: String,
    pub category: Option<String>,
}

#[tauri::command]
pub async fn create_prompt(
    state: State<'_, DbState>,
    input: CreatePromptInput,
) -> AppResult<SavedPrompt> {
    PromptService::create_prompt(
        &state.pool,
        &input.name,
        &input.body,
        input.category.as_deref()
    ).await
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptInput {
    pub id: String,
    pub name: Option<String>,
    pub body: Option<String>,
    pub category: Option<String>,
}

#[tauri::command]
pub async fn update_prompt(
    state: State<'_, DbState>,
    input: UpdatePromptInput,
) -> AppResult<()> {
    PromptService::update_prompt(
        &state.pool,
        &input.id,
        input.name.as_deref(),
        input.body.as_deref(),
        input.category.as_deref()
    ).await
}

#[tauri::command]
pub async fn toggle_prompt_favorite(
    state: State<'_, DbState>,
    id: String,
    favorite: bool,
) -> AppResult<()> {
    PromptService::toggle_favorite(&state.pool, &id, favorite).await
}

#[tauri::command]
pub async fn delete_prompt(
    state: State<'_, DbState>,
    id: String,
) -> AppResult<()> {
    PromptService::delete_prompt(&state.pool, &id).await
}
