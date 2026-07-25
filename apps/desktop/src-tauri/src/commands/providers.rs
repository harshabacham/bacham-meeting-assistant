use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::services::provider_service::{ProviderService, ProviderConfig};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SaveProviderConfigPayload {
    pub provider: String,
    pub enabled: bool,
    pub default_model: Option<String>,
    pub config_json: Option<String>,
    pub api_key: Option<String>,
}

#[tauri::command]
pub async fn list_providers(app: AppHandle) -> AppResult<Vec<ProviderConfig>> {
    let pool = &app.state::<crate::database::DbState>().pool;
    ProviderService::list_configs(pool).await
}

#[tauri::command]
pub async fn save_provider_config(
    app: AppHandle,
    payload: SaveProviderConfigPayload,
) -> AppResult<()> {
    let pool = &app.state::<crate::database::DbState>().pool;
    ProviderService::save_config(
        pool,
        &payload.provider,
        payload.enabled,
        payload.default_model,
        payload.config_json,
        payload.api_key,
    ).await
}
