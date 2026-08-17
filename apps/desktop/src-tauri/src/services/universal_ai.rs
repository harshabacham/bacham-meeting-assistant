use crate::error::{AppError, AppResult};
use reqwest::Client;
use keyring::Entry;
use tauri::{Manager, Emitter};

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

    pub async fn get_provider_token(provider: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        // Fallback for legacy gemini api key
        let key_name = if provider == "bacham.gemini" { "gemini_api_key" } else { provider };
        
        // 1. Check OS Keyring
        if let Ok(entry) = Entry::new("bacham", key_name) {
            if let Ok(key) = entry.get_password() {
                if !key.trim().is_empty() {
                    return Ok(key.trim().to_string());
                }
            }
        }

        // 2. Check Environment Variables
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

        // 3. Check SQLite settings table (Essential on Windows dev mode and app storage)
        use sqlx::Row;
        let query_keys = match provider {
            "bacham.gemini" => vec!["gemini_api_key", "apiKey", "geminiApiKey", "gemini_api_key_ref"],
            "bacham.openai" => vec!["openai_api_key", "openaiApiKey", "bacham.openai"],
            "bacham.anthropic" => vec!["anthropic_api_key", "anthropicApiKey", "bacham.anthropic"],
            "bacham.openrouter" => vec!["openrouter_api_key", "openrouterApiKey", "bacham.openrouter"],
            _ => vec![key_name],
        };

        for qk in query_keys {
            if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
                .bind(qk)
                .fetch_optional(pool)
                .await 
            {
                let val: String = row.get("value");
                let trimmed = val.trim().to_string();
                if !trimmed.is_empty() && trimmed != "true" {
                    return Ok(trimmed);
                }
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
            _ =>
                Self::call_gemini_with_model_rotation(prompt, system, pool).await,

        }
    }

    async fn call_provider_multimodal(provider: &str, prompt: &str, system: &str, image_parts: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        match provider {
            "bacham.openai" => Self::call_openai_vision(prompt, system, image_parts, pool).await,
            "bacham.anthropic" => Self::call_anthropic_vision(prompt, system, image_parts, pool).await,
            "bacham.openrouter" => Self::call_openrouter_vision(prompt, system, image_parts, pool).await,
            "bacham.ollama" => Self::call_ollama_vision(prompt, system, image_parts, pool).await,
            "bacham.lmstudio" => Self::call_lmstudio(prompt, system, pool).await, // LM Studio fallback to text
            _ =>
                Self::call_gemini_multimodal_with_rotation(prompt, system, image_parts, pool).await,

        }
    }

    pub async fn generate_text(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;
        eprintln!("[UniversalAI] Active provider: {}", preferred);

        // Try preferred provider first
        match Self::call_provider_text(&preferred, prompt, system_instruction, pool).await {
            Ok(res) => {
                eprintln!("[UniversalAI] Success with preferred provider: {}", preferred);
                return Ok(res);
            }
            Err(e) => {
                eprintln!("[UniversalAI] Preferred provider '{}' failed: {}. Trying fallbacks...", preferred, e);
            }
        }

        // Fallback chain - try providers that have keys configured
        let all_providers = ["bacham.anthropic", "bacham.openai", "bacham.openrouter", "bacham.ollama", "bacham.gemini"];
        for fb in all_providers.iter() {
            if *fb == preferred { continue; } // already tried
            if *fb != "bacham.ollama" {
                // Check if key exists (skip if no key)
                match Self::get_provider_token(fb, pool).await {
                    Ok(_) => {}
                    Err(_) => {
                        eprintln!("[UniversalAI] Skipping {} - no API key configured", fb);
                        continue;
                    }
                }
            }
            eprintln!("[UniversalAI] Trying fallback provider: {}", fb);
            match Self::call_provider_text(fb, prompt, system_instruction, pool).await {
                Ok(res) => {
                    eprintln!("[UniversalAI] Fallback SUCCESS with: {}", fb);
                    return Ok(res);
                }
                Err(e) => {
                    eprintln!("[UniversalAI] Fallback '{}' also failed: {}", fb, e);
                }
            }
        }

        Err(crate::error::AppError::Internal(
            "All AI providers failed or have no API key configured. Please add a valid API key in Settings.".to_string()
        ))
    }

    pub async fn generate_multimodal(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;
        eprintln!("[UniversalAI] Multimodal active provider: {}", preferred);

        match Self::call_provider_multimodal(&preferred, prompt, system_instruction, image_parts, pool).await {
            Ok(res) => return Ok(res),
            Err(e) => {
                eprintln!("[UniversalAI] Multimodal preferred '{}' failed: {}. Trying fallbacks...", preferred, e);
            }
        }

        let all_providers = ["bacham.anthropic", "bacham.openai", "bacham.openrouter", "bacham.ollama", "bacham.gemini"];
        for fb in all_providers.iter() {
            if *fb == preferred { continue; }
            if *fb != "bacham.ollama" {
                if Self::get_provider_token(fb, pool).await.is_err() {
                    continue;
                }
            }
            eprintln!("[UniversalAI] Trying multimodal fallback: {}", fb);
            if let Ok(res) = Self::call_provider_multimodal(fb, prompt, system_instruction, image_parts, pool).await {
                eprintln!("[UniversalAI] Multimodal fallback SUCCESS with: {}", fb);
                return Ok(res);
            }
        }

        Err(crate::error::AppError::Internal(
            "All AI providers failed for multimodal. Please configure a valid API key in Settings.".to_string()
        ))
    }

    // --- Gemini Model Rotation ---
    // Tries multiple Gemini models in order when one hits quota limits (429)

    pub async fn call_gemini_with_model_rotation(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        // Dynamically discover all valid models for this API key from Google
        let models = match crate::services::gemini_service::GeminiService::discover_available_models(pool).await {
            Ok(list) if !list.is_empty() => list,
            _ => vec![
                "gemini-3.5-flash-lite".to_string(),
                "gemini-3.5-flash".to_string(),
                "gemini-flash-latest".to_string(),
                "gemini-3.7-flash".to_string(),
            ]
        };

        let mut last_err = String::new();
        for model in &models {
            eprintln!("[UniversalAI] Trying Gemini model: {}", model);
            match crate::services::gemini_service::GeminiService::generate_text_with_model_direct(
                prompt, system, pool, model
            ).await {
                Ok(res) => {
                    eprintln!("[UniversalAI] Gemini model {} succeeded", model);
                    return Ok(res);
                }
                Err(e) => {
                    let msg = e.to_string();
                    eprintln!("[UniversalAI] Gemini model {} failed: {}", model, msg);
                    last_err = msg;
                }
            }
        }
        Err(AppError::Internal(format!(
            "All Gemini models failed. Last error: {}. Please check your API key at https://aistudio.google.com",
            last_err
        )))
    }

    pub async fn call_gemini_multimodal_with_rotation(prompt: &str, system: &str, images: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        // Dynamically discover models from Google
        let models = match crate::services::gemini_service::GeminiService::discover_available_models(pool).await {
            Ok(list) if !list.is_empty() => list,
            _ => vec![
                "gemini-3.5-flash-lite".to_string(),
                "gemini-3.5-flash".to_string(),
                "gemini-flash-latest".to_string(),
                "gemini-3.7-flash".to_string(),
            ]
        };

        let mut last_err = String::new();
        for model in &models {
            eprintln!("[UniversalAI] Trying Gemini multimodal model: {}", model);
            match crate::services::gemini_service::GeminiService::generate_multimodal_with_model_direct(
                prompt, system, images, pool, model
            ).await {
                Ok(res) => {
                    eprintln!("[UniversalAI] Gemini multimodal model {} succeeded", model);
                    return Ok(res);
                }
                Err(e) => {
                    let msg = e.to_string();
                    eprintln!("[UniversalAI] Gemini multimodal model {} failed: {}", model, msg);
                    last_err = msg;
                }
            }
        }
        Err(AppError::Internal(format!(
            "All Gemini multimodal models quota-exhausted. Last error: {}", last_err
        )))
    }

    // --- Provider Implementations ---

    async fn call_openai(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openai", pool).await?;
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

    async fn call_openai_vision(prompt: &str, system: &str, images: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openai", pool).await?;
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

    async fn call_anthropic(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.anthropic", pool).await?;
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

    async fn call_anthropic_vision(prompt: &str, system: &str, images: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.anthropic", pool).await?;
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

    async fn call_ollama(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.ollama", pool).await.unwrap_or_else(|_| "http://localhost:11434".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        // Auto-detect available model
        let tags_url = format!("{}/api/tags", url.trim_end_matches('/'));
        let mut model = "llama3.1".to_string();
        if let Ok(res) = client.get(&tags_url).send().await {
            if let Ok(body) = res.json::<serde_json::Value>().await {
                if let Some(models) = body.get("models").and_then(|m| m.as_array()) {
                    if !models.is_empty() {
                        if let Some(name) = models[0].get("name").and_then(|n| n.as_str()) {
                            model = name.to_string();
                        }
                    }
                }
            }
        }

        let payload = serde_json::json!({
            "model": model,
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

    async fn call_ollama_vision(prompt: &str, system: &str, images: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.ollama", pool).await.unwrap_or_else(|_| "http://localhost:11434".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let tags_url = format!("{}/api/tags", url.trim_end_matches('/'));
        let mut model = "llava".to_string(); 
        if let Ok(res) = client.get(&tags_url).send().await {
            if let Ok(body) = res.json::<serde_json::Value>().await {
                if let Some(models) = body.get("models").and_then(|m| m.as_array()) {
                    let mut found_vision = false;
                    for m in models {
                        if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                            if name.contains("llava") || name.contains("vision") || name.contains("bakllava") {
                                model = name.to_string();
                                found_vision = true;
                                break;
                            }
                        }
                    }
                    if !found_vision && !models.is_empty() {
                        if let Some(name) = models[0].get("name").and_then(|n| n.as_str()) {
                            model = name.to_string();
                        }
                    }
                }
            }
        }

        let base64_images: Vec<String> = images.iter().map(|(b64, _)| b64.clone()).collect();

        let payload = serde_json::json!({
            "model": model,
            "system": system,
            "prompt": prompt,
            "images": base64_images,
            "stream": false
        });

        let res = client.post(format!("{}/api/generate", url.trim_end_matches('/')))
            .json(&payload)
            .send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(format!("Ollama Vision API Error: {}", res.text().await.unwrap_or_default())));
        }

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body["response"].as_str().unwrap_or_default().to_string();
        Ok(text)
    }

    async fn call_lmstudio(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.lmstudio", pool).await.unwrap_or_else(|_| "http://localhost:1234/v1".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ]
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

    async fn call_openrouter(prompt: &str, system: &str, pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openrouter", pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "meta-llama/llama-3-70b-instruct",
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ]
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

    async fn call_openrouter_vision(prompt: &str, system: &str, images: &[(String, String)], pool: &sqlx::SqlitePool) -> AppResult<String> {
        let token = Self::get_provider_token("bacham.openrouter", pool).await?;
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

    /// Universal stream_chat: routes through the active provider and emits ai_chat_chunk
    pub async fn stream_chat(
        app: &tauri::AppHandle,
        system_prompt: &str,
        history: &[crate::services::gemini_service::ChatMessage],
        prompt: &str,
    ) -> AppResult<()> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        
        // Build a single combined prompt from history + current message
        let mut full_prompt = String::new();
        for msg in history {
            let role = if msg.role == "user" { "User" } else { "Assistant" };
            full_prompt.push_str(&format!("{}: {}\n", role, msg.content));
        }
        // Add current user message if not already in history
        if history.last().map(|m| m.content.as_str()) != Some(prompt) {
            full_prompt.push_str(&format!("User: {}\n", prompt));
        }
        full_prompt.push_str("Assistant:");
        
        let response = Self::generate_text(&full_prompt, system_prompt, &pool).await?;
        
        app.emit("ai_chat_chunk", serde_json::json!({ "chunk": response }))
           .map_err(|e| AppError::Internal(e.to_string()))?;
        
        Ok(())
    }

    /// Universal stream_chat_with_references: routes through active provider, parses [REF:] markers
    pub async fn stream_chat_grounded(
        app: &tauri::AppHandle,
        system_prompt: &str,
        history: &[crate::services::gemini_service::ChatMessage],
        prompt: &str,
    ) -> AppResult<Vec<crate::services::gemini_service::ChatReference>> {
        let pool = app.state::<crate::database::DbState>().pool.clone();

        // Build a single combined prompt from history + current message
        let mut full_prompt = String::new();
        for msg in history {
            let role = if msg.role == "user" { "User" } else { "Assistant" };
            full_prompt.push_str(&format!("{}: {}\n", role, msg.content));
        }
        if history.last().map(|m| m.content.as_str()) != Some(prompt) {
            full_prompt.push_str(&format!("User: {}\n", prompt));
        }
        full_prompt.push_str("Assistant:");

        let text = Self::generate_text(&full_prompt, system_prompt, &pool).await?;

        let references = crate::services::gemini_service::GeminiService::parse_references_pub(&text);
        let clean_text = crate::services::gemini_service::GeminiService::strip_references_pub(&text);

        app.emit("ai_chat_chunk", serde_json::json!({ "chunk": clean_text, "references": references }))
           .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(references)
    }
}
