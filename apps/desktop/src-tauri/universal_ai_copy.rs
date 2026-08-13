use crate::error::{AppError, AppResult};
use reqwest::Client;
use keyring::Entry;

pub struct UniversalAiService;

impl UniversalAiService {
    pub async fn get_active_provider(pool: &sqlx::SqlitePool) -> String {
        use sqlx::Row;
        let row = sqlx::query("SELECT value FROM settings WHERE key = 'aiProvider'")
            .fetch_optional(pool)
            .await.unwrap_or(None);
        
        if let Some(r) = row {
            let val = r.get::<String, _>("value");
            if !val.trim().is_empty() {
                // If it's legacy 'gemini', return the new format
                if val == "gemini" { return "bacham.gemini".to_string(); }
                if val == "ollama" { return "bacham.ollama".to_string(); }
                return val.trim().to_string();
            }
        }
        "bacham.gemini".to_string()
    }

    pub async fn get_provider_token(provider: &str) -> AppResult<String> {
        // Fallback for legacy gemini api key
        let key_name = if provider == "bacham.gemini" { "gemini_api_key" } else { provider };
        let entry = Entry::new("bacham", key_name).map_err(|e| AppError::Internal(e.to_string()))?;
        if let Ok(key) = entry.get_password() {
            if !key.trim().is_empty() {
                return Ok(key.trim().to_string());
            }
        }

        // Environment Variable Fallbacks
        let env_key = match provider {
            "bacham.anthropic" => std::env::var("ANTHROPIC_AUTH_TOKEN").or_else(|_| std::env::var("ANTHROPIC_API_KEY")).ok(),
            "bacham.openrouter" => std::env::var("OPENROUTER_API_KEY").ok(),
            "bacham.openai" => std::env::var("OPENAI_API_KEY").ok(),
            "bacham.gemini" => std::env::var("GEMINI_API_KEY").ok(),
            _ => None
        };

        if let Some(key) = env_key {
            if !key.trim().is_empty() {
                return Ok(key.trim().to_string());
            }
        }

        Err(AppError::Internal(format!("API Key not configured for {}", provider)))
    }

    async fn call_provider_text(provider: &str, prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        match provider {
            "bacham.openai" => Self::call_openai(prompt, system, pool).await,
            "bacham.anthropic" => Self::call_anthropic(prompt, system, pool).await,
            "bacham.ollama" => Self::call_ollama(prompt, system, pool).await,
            "bacham.lmstudio" => Self::call_lmstudio(prompt, system, pool).await,
            "bacham.openrouter" => Self::call_openrouter(prompt, system, pool).await,
            _ => crate::services::gemini_service::GeminiService::generate_text_with_model_direct(prompt, system, pool, "gemini-2.0-flash-lite").await,
        }
    }

    async fn call_provider_multimodal(provider: &str, prompt: &str, system: &str, image_parts: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        match provider {
            "bacham.openai" => Self::call_openai_vision(prompt, system, image_parts, pool).await,
            "bacham.anthropic" => Self::call_anthropic_vision(prompt, system, image_parts, pool).await,
            "bacham.openrouter" => Self::call_openrouter_vision(prompt, system, image_parts, pool).await,
            "bacham.ollama" => Self::call_ollama(prompt, system, pool).await, // Fallback to text
            "bacham.lmstudio" => Self::call_lmstudio(prompt, system, pool).await,
            _ => crate::services::gemini_service::GeminiService::generate_multimodal_with_model_direct(prompt, system, image_parts, pool, "gemini-2.0-flash-lite").await,
        }
    }

    pub async fn generate_text(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;

        if let Ok(res) = Self::call_provider_text(&preferred, prompt, system_instruction, pool).await {
            return Ok(res);
        }

        let fallbacks = ["bacham.anthropic", "bacham.openrouter", "bacham.openai", "bacham.ollama", "bacham.gemini"];
        for fb in fallbacks.iter() {
            if *fb == preferred { continue; }
            if *fb != "bacham.ollama" && Self::get_provider_token(fb).await.is_err() { continue; }
            
            if let Ok(res) = Self::call_provider_text(fb, prompt, system_instruction, pool).await {
                return Ok(res);
            }
        }

        Err(AppError::Internal("All AI providers failed or are unavailable".to_string()))
    }

    pub async fn generate_multimodal(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;

        if let Ok(res) = Self::call_provider_multimodal(&preferred, prompt, system_instruction, image_parts, pool).await {
            return Ok(res);
        }

        let fallbacks = ["bacham.anthropic", "bacham.openrouter", "bacham.openai", "bacham.ollama", "bacham.gemini"];
        for fb in fallbacks.iter() {
            if *fb == preferred { continue; }
            if *fb != "bacham.ollama" && Self::get_provider_token(fb).await.is_err() { continue; }
            
            if let Ok(res) = Self::call_provider_multimodal(fb, prompt, system_instruction, image_parts, pool).await {
                return Ok(res);
            }
        }

        Err(AppError::Internal("All AI providers failed or are unavailable".to_string()))
    }

    // --- Provider Implementations ---

    async fn call_openai(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openai").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "gpt-4o",
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ]
        });

        let res = client.post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(token)
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("OpenAI API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_openai_vision(prompt: &str, system: &str, images: &[(String, String)], _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openai").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let mut content = vec![serde_json::json!({ "type": "text", "text": prompt })];
        for (b64, mime) in images {
            content.push(serde_json::json!({
                "type": "image_url",
                "image_url": { "url": format!("data:{};base64,{}", mime, b64) }
            }));
        }

        let payload = serde_json::json!({
            "model": "gpt-4o",
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": content }
            ]
        });

        let res = client.post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(token)
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("OpenAI Vision Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_anthropic(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.anthropic").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 4096,
            "system": system,
            "messages": [
                { "role": "user", "content": prompt }
            ]
        });

        let res = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", token)
            .header("anthropic-version", "2023-06-01")
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("Anthropic API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["content"][0]["text"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_anthropic_vision(prompt: &str, system: &str, images: &[(String, String)], _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.anthropic").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let mut content = vec![];
        for (b64, mime) in images {
            content.push(serde_json::json!({
                "type": "image",
                "source": { "type": "base64", "media_type": mime, "data": b64 }
            }));
        }
        content.push(serde_json::json!({ "type": "text", "text": prompt }));

        let payload = serde_json::json!({
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 4096,
            "system": system,
            "messages": [
                { "role": "user", "content": content }
            ]
        });

        let res = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", token)
            .header("anthropic-version", "2023-06-01")
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("Anthropic Vision Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["content"][0]["text"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_ollama(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.ollama").await.unwrap_or_else(|_| "http://localhost:11434".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "llama3.1", // Modern fallback
            "system": system,
            "prompt": prompt,
            "stream": false
        });

        let res = client.post(format!("{}/api/generate", url.trim_end_matches('/')))
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("Ollama API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["response"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_lmstudio(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.lmstudio").await.unwrap_or_else(|_| "http://localhost:1234/v1".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ],
            "response_format": { "type": "json_object" }
        });

        let res = client.post(format!("{}/chat/completions", url.trim_end_matches('/')))
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("LM Studio API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_openrouter(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openrouter").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "meta-llama/llama-3-70b-instruct",
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ],
            "response_format": { "type": "json_object" }
        });

        let res = client.post("https://openrouter.ai/api/v1/chat/completions")
            .bearer_auth(token)
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("OpenRouter API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_openrouter_vision(prompt: &str, system: &str, images: &[(String, String)], _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openrouter").await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let mut content = vec![serde_json::json!({ "type": "text", "text": prompt })];
        for (b64, mime) in images {
            content.push(serde_json::json!({
                "type": "image_url",
                "image_url": { "url": format!("data:{};base64,{}", mime, b64) }
            }));
        }

        let payload = serde_json::json!({
            "model": "anthropic/claude-3.5-sonnet",
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": content }
            ],
            "response_format": { "type": "json_object" }
        });

        let res = client.post("https://openrouter.ai/api/v1/chat/completions")
            .bearer_auth(token)
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("OpenRouter Vision Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }
}
