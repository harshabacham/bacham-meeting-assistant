use serde::{Deserialize, Serialize};
use tauri::State;
use sqlx::Row;
use keyring::Entry;

use crate::error::AppResult;
use crate::database::DbState;

#[derive(Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub accent_color: String,
    pub language: String,
    pub storage_root_path: String,
    pub gemini_api_key_set: bool,
    /// Smart Search sends lecture content to Gemini's embedding API.
    /// Off by default — local-first. User must opt in.
    pub smart_search_enabled: bool,
    pub ai_provider: String,
    pub ai_max_retries: i32,
    pub workspace_panel_sizes: Vec<f64>,
    pub speaker_mapping: std::collections::HashMap<String, String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateSettingsInput {
    pub theme: Option<String>,
    pub accent_color: Option<String>,
    pub language: Option<String>,
    pub smart_search_enabled: Option<bool>,
    pub ai_provider: Option<String>,
    pub ai_max_retries: Option<i32>,
    pub workspace_panel_sizes: Option<Vec<f64>>,
    pub speaker_mapping: Option<std::collections::HashMap<String, String>>,
}

#[tauri::command]
pub async fn settings_get(state: State<'_, DbState>) -> AppResult<Settings> {
    let pool = &state.pool;
    
    let theme_row = sqlx::query("SELECT value FROM settings WHERE key = 'theme'").fetch_optional(pool).await?;
    let theme = theme_row.map(|r| r.get("value")).unwrap_or_else(|| "system".to_string());
    
    let accent_row = sqlx::query("SELECT value FROM settings WHERE key = 'accent_color'").fetch_optional(pool).await?;
    let accent_color = accent_row.map(|r| r.get("value")).unwrap_or_else(|| "lime".to_string());
    
    let lang_row = sqlx::query("SELECT value FROM settings WHERE key = 'language'").fetch_optional(pool).await?;
    let language = lang_row.map(|r| r.get("value")).unwrap_or_else(|| "en".to_string());
    
    let storage_row = sqlx::query("SELECT value FROM settings WHERE key = 'storage_root_path'").fetch_optional(pool).await?;
    let storage_root_path = storage_row.map(|r| r.get("value")).unwrap_or_else(|| "".to_string());
    
    let key_set_row = sqlx::query("SELECT value FROM settings WHERE key = 'gemini_api_key_ref'").fetch_optional(pool).await?;
    let gemini_api_key_set = key_set_row.map(|r| r.get::<String, _>("value") == "true").unwrap_or(false);

    let smart_search_row = sqlx::query("SELECT value FROM settings WHERE key = 'smart_search_enabled'").fetch_optional(pool).await?;
    let smart_search_enabled = smart_search_row.map(|r| r.get::<String, _>("value") == "true").unwrap_or(false);

    let provider_row = sqlx::query("SELECT value FROM settings WHERE key = 'ai_provider'").fetch_optional(pool).await?;
    let ai_provider = provider_row.map(|r| r.get("value")).unwrap_or_else(|| "gemini".to_string());

    let retries_row = sqlx::query("SELECT value FROM settings WHERE key = 'ai_max_retries'").fetch_optional(pool).await?;
    let ai_max_retries = retries_row.map(|r| r.get::<String, _>("value").parse::<i32>().unwrap_or(5)).unwrap_or(5);

    let panel_sizes_row = sqlx::query("SELECT value FROM settings WHERE key = 'workspace_panel_sizes'").fetch_optional(pool).await?;
    let workspace_panel_sizes = panel_sizes_row
        .map(|r| serde_json::from_str::<Vec<f64>>(&r.get::<String, _>("value")).unwrap_or_else(|_| vec![20.0, 55.0, 25.0]))
        .unwrap_or_else(|| vec![20.0, 55.0, 25.0]);

    let speaker_mapping_row = sqlx::query("SELECT value FROM settings WHERE key = 'speaker_mapping'").fetch_optional(pool).await?;
    let speaker_mapping = speaker_mapping_row
        .map(|r| serde_json::from_str::<std::collections::HashMap<String, String>>(&r.get::<String, _>("value")).unwrap_or_default())
        .unwrap_or_default();

    Ok(Settings {
        theme,
        accent_color,
        language,
        storage_root_path,
        gemini_api_key_set,
        smart_search_enabled,
        ai_provider,
        ai_max_retries,
        workspace_panel_sizes,
        speaker_mapping,
    })
}

#[tauri::command]
pub async fn settings_update(input: UpdateSettingsInput, state: State<'_, DbState>) -> AppResult<Settings> {
    let pool = &state.pool;
    
    if let Some(t) = input.theme {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)")
            .bind(t)
            .execute(pool).await?;
    }
        
    if let Some(a) = input.accent_color {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('accent_color', ?)")
            .bind(a)
            .execute(pool).await?;
    }
        
    if let Some(l) = input.language {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('language', ?)")
            .bind(l)
            .execute(pool).await?;
    }

    if let Some(sse) = input.smart_search_enabled {
        let val = if sse { "true" } else { "false" };
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('smart_search_enabled', ?)")
            .bind(val)
            .execute(pool).await?;
    }

    if let Some(provider) = input.ai_provider {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider', ?)")
            .bind(provider)
            .execute(pool).await?;
    }

    if let Some(r) = input.ai_max_retries {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_max_retries', ?)")
            .bind(r.to_string())
            .execute(pool).await?;
    }

    if let Some(sizes) = input.workspace_panel_sizes {
        let val = serde_json::to_string(&sizes).unwrap_or_else(|_| "[20.0, 55.0, 25.0]".to_string());
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('workspace_panel_sizes', ?)")
            .bind(val)
            .execute(pool).await?;
    }

    if let Some(mapping) = input.speaker_mapping {
        let val = serde_json::to_string(&mapping).unwrap_or_else(|_| "{}".to_string());
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('speaker_mapping', ?)")
            .bind(val)
            .execute(pool).await?;
    }
    
    // Return the updated settings
    settings_get(state).await
}

#[derive(Deserialize)]
pub struct ApiKeyInput {
    pub key: String,
}

#[tauri::command]
pub async fn settings_set_api_key(input: ApiKeyInput, state: State<'_, DbState>) -> AppResult<bool> {
    let entry_res = Entry::new("bacham", "gemini_api_key");
    
    if let Ok(entry) = entry_res {
        let _ = entry.set_password(&input.key);
    }

    // ALWAYS write to SQLite because Windows Credential Manager is often flaky in dev mode 
    // and might claim success on set_password but fail on get_password.
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)")
        .bind(&input.key)
        .execute(&state.pool).await?;
        
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key_ref', 'true')")
        .execute(&state.pool).await?;
        
    Ok(true)
}
