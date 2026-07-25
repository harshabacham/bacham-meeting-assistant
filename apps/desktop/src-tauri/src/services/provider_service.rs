use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use keyring::Entry;
use crate::error::{AppError, AppResult};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub id: String,
    pub provider: String,
    pub enabled: bool,
    pub default_model: Option<String>,
    pub config_json: Option<String>,
    // We do NOT send the API key to the frontend for security reasons,
    // but we can send a boolean indicating if it's set.
    pub has_key: bool,
}

pub struct ProviderService;

impl ProviderService {
    pub async fn list_configs(pool: &SqlitePool) -> AppResult<Vec<ProviderConfig>> {
        let rows = sqlx::query!("SELECT id, provider, enabled, default_model, config_json FROM ai_provider_configs")
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut configs = Vec::new();
        for row in rows {
            let has_key = match Entry::new("bacham", &format!("{}_api_key", row.provider)) {
                Ok(entry) => entry.get_password().is_ok(),
                Err(_) => false,
            };

            configs.push(ProviderConfig {
                id: row.id.unwrap_or_default(),
                provider: row.provider,
                enabled: row.enabled != 0,
                default_model: row.default_model,
                config_json: row.config_json,
                has_key,
            });
        }

        // If table is empty, seed defaults (Gemini is primary)
        if configs.is_empty() {
            Self::seed_defaults(pool).await?;
            return Box::pin(Self::list_configs(pool)).await;
        }

        Ok(configs)
    }

    pub async fn save_config(
        pool: &SqlitePool,
        provider: &str,
        enabled: bool,
        default_model: Option<String>,
        config_json: Option<String>,
        api_key: Option<String>,
    ) -> AppResult<()> {
        let id = Uuid::new_v4().to_string();

        // 1. Store API key in keyring if provided
        if let Some(key) = api_key {
            let entry = Entry::new("bacham", &format!("{}_api_key", provider))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            entry.set_password(&key).map_err(|e| AppError::Internal(e.to_string()))?;
        }

        // 2. Disable other providers if this one is being enabled (we only support one active at a time for now)
        if enabled {
            sqlx::query!("UPDATE ai_provider_configs SET enabled = 0")
                .execute(pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }

        // 3. Upsert config
        let existing = sqlx::query!("SELECT id FROM ai_provider_configs WHERE provider = ?", provider)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let enabled_int = if enabled { 1 } else { 0 };

        if existing.is_some() {
            sqlx::query!(
                "UPDATE ai_provider_configs 
                 SET enabled = ?, default_model = ?, config_json = ? 
                 WHERE provider = ?",
                enabled_int,
                default_model,
                config_json,
                provider
            )
            .execute(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        } else {
            sqlx::query!(
                "INSERT INTO ai_provider_configs (id, provider, enabled, default_model, config_json)
                 VALUES (?, ?, ?, ?, ?)",
                id,
                provider,
                enabled_int,
                default_model,
                config_json
            )
            .execute(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        }

        Ok(())
    }

    pub async fn get_active_provider(pool: &SqlitePool) -> AppResult<String> {
        let row = sqlx::query!("SELECT provider FROM ai_provider_configs WHERE enabled = 1 LIMIT 1")
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(r) = row {
            Ok(r.provider)
        } else {
            Ok("gemini".to_string()) // Fallback
        }
    }

    pub async fn get_api_key(pool: &SqlitePool, provider: &str) -> AppResult<String> {
        let entry = Entry::new("bacham", &format!("{}_api_key", provider))
            .map_err(|e| AppError::Internal(e.to_string()))?;
            
        if let Ok(key) = entry.get_password() {
            if !key.trim().is_empty() {
                return Ok(key.trim().to_string());
            }
        }

        let env_key_name = format!("{}_API_KEY", provider.to_uppercase());
        if let Ok(env_key) = std::env::var(&env_key_name) {
            if !env_key.trim().is_empty() {
                return Ok(env_key.trim().to_string());
            }
        }

        // Migration fallback: check SQLite
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(format!("{}_api_key", provider))
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
            
        if let Some(r) = row {
            let key = sqlx::Row::get::<String, _>(&r, "value");
            let key = key.trim().to_string();
            if !key.is_empty() {
                // Migrate to keyring if possible
                if let Ok(entry) = Entry::new("bacham", &format!("{}_api_key", provider)) {
                    let _ = entry.set_password(&key);
                }
                return Ok(key);
            }
        }

        Err(AppError::Internal(format!("No API key found for provider: {}", provider)))
    }

    async fn seed_defaults(pool: &SqlitePool) -> AppResult<()> {
        let gemini_id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO ai_provider_configs (id, provider, enabled, default_model) VALUES (?, 'gemini', 1, 'gemini-3.1-flash-lite')",
            gemini_id
        ).execute(pool).await.map_err(|e| AppError::Internal(e.to_string()))?;
        
        let openai_id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO ai_provider_configs (id, provider, enabled, default_model) VALUES (?, 'openai', 0, 'gpt-4o')",
            openai_id
        ).execute(pool).await.map_err(|e| AppError::Internal(e.to_string()))?;
        
        let openrouter_id = Uuid::new_v4().to_string();
        sqlx::query!(
            "INSERT INTO ai_provider_configs (id, provider, enabled, default_model) VALUES (?, 'openrouter', 0, 'anthropic/claude-3-haiku')",
            openrouter_id
        ).execute(pool).await.map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }
}
