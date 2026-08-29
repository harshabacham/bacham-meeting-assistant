use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use tauri::{AppHandle, Manager, Emitter};
use sqlx::Row;
use sha2::{Sha256, Digest};
use uuid::Uuid;
use keyring::Entry;

pub struct GeminiService;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// A parsed reference found in a chat response.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatReference {
    pub ref_type: String,  // 'timestamp' | 'screenshot'
    pub value: String,
}

/// Exact refusal string — per spec, do not paraphrase.
pub const REFUSAL_STRING: &str = "I couldn't find that information in this lecture.";

impl GeminiService {
    pub async fn get_api_key(pool: &sqlx::SqlitePool) -> AppResult<String> {
        // 1. Try Keyring safely without bubbling error
        if let Ok(entry) = Entry::new("bacham", "gemini_api_key") {
            if let Ok(key) = entry.get_password() {
                let trimmed = key.trim().to_string();
                if !trimmed.is_empty() && trimmed != "true" {
                    return Ok(trimmed);
                }
            }
        }

        // 2. Try Env variables
        if let Ok(env_key) = std::env::var("GEMINI_API_KEY") {
            let trimmed = env_key.trim().to_string();
            if !trimmed.is_empty() {
                return Ok(trimmed);
            }
        }
        
        // 3. Robust SQLite settings search across all possible keys
        let candidate_keys = ["gemini_api_key", "apiKey", "geminiApiKey", "bacham.gemini", "gemini"];
        for ck in candidate_keys {
            if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
                .bind(ck)
                .fetch_optional(pool)
                .await 
            {
                use sqlx::Row;
                let val: String = row.get("value");
                let trimmed = val.trim().to_string();
                if !trimmed.is_empty() && trimmed != "true" {
                    return Ok(trimmed);
                }
            }
        }
        
        Err(AppError::Internal("No API Key set. Please configure your Google Gemini API key in Settings -> Integrations -> Google Gemini.".into()))
    }

    /// Dynamically discover all active models available for the user's API key
    pub async fn discover_available_models(pool: &sqlx::SqlitePool) -> AppResult<Vec<String>> {
        let key = Self::get_api_key(pool).await?;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());
        let list_url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", key);
        
        let mut user_preferred_model = None;
        for mk in ["gemini_model", "ai_model", "selected_model", "model"] {
            if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
                .bind(mk)
                .fetch_optional(pool)
                .await 
            {
                use sqlx::Row;
                let val: String = row.get("value");
                let trimmed = val.trim().to_string();
                if !trimmed.is_empty() && trimmed != "true" {
                    user_preferred_model = Some(trimmed);
                    break;
                }
            }
        }

        let mut discovered = Vec::new();
        if let Ok(res) = client.get(&list_url).send().await {
            if res.status().is_success() {
                if let Ok(body) = res.json::<serde_json::Value>().await {
                    if let Some(models) = body.get("models").and_then(|m| m.as_array()) {
                        for m in models {
                            if let Some(methods) = m.get("supportedGenerationMethods").and_then(|methods| methods.as_array()) {
                                if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                    if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                        let model_id = name.strip_prefix("models/").unwrap_or(name).to_string();
                                        let lower = model_id.to_lowercase();
                                        // Exclude only audio-only TTS and embedding models that do not accept text/image generation
                                        if !lower.contains("tts") && !lower.contains("embedding") && !lower.contains("aqa") {
                                            if !discovered.contains(&model_id) {
                                                discovered.push(model_id);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Sort discovered models so active flash/fast models come first, pro models next, and all other models follow
        discovered.sort_by(|a, b| {
            let score = |m: &str| -> i32 {
                let lower = m.to_lowercase();
                if lower.contains("3.5-flash-lite") { 1 }
                else if lower.contains("3.5-flash") { 2 }
                else if lower.contains("flash-latest") { 3 }
                else if lower.contains("3.6-flash") { 4 }
                else if lower.contains("3.7-flash") { 5 }
                else if lower.contains("2.0-flash") { 6 }
                else if lower.contains("1.5-flash") { 7 }
                else if lower.contains("flash") { 8 }
                else if lower.contains("3.5-pro") { 9 }
                else if lower.contains("2.0-pro") { 10 }
                else if lower.contains("1.5-pro") { 11 }
                else if lower.contains("pro") { 12 }
                else { 13 }
            };
            score(a).cmp(&score(b))
        });

        if let Some(pref) = user_preferred_model {
            discovered.retain(|m| m != &pref);
            discovered.insert(0, pref);
        }

        if discovered.is_empty() {
            discovered = vec![
                "gemini-3.5-flash-lite".to_string(),
                "gemini-3.5-flash".to_string(),
                "gemini-flash-latest".to_string(),
                "gemini-3.7-flash".to_string(),
                "gemini-2.0-flash".to_string(),
                "gemini-1.5-flash".to_string(),
                "gemini-1.5-pro".to_string(),
            ];
        }

        Ok(discovered)
    }

    pub async fn generate_text(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        Self::generate_text_with_model(prompt, system_instruction, pool, "gemini-1.5-flash").await
    }

    pub async fn generate_text_with_model(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
        model: &str,
    ) -> AppResult<String> {
        Self::generate_text_with_model_direct(prompt, system_instruction, pool, model).await
    }

    pub async fn generate_text_with_model_direct(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
        model: &str,
    ) -> AppResult<String> {
        let mut hasher = Sha256::new();
        hasher.update(prompt.as_bytes());
        hasher.update(system_instruction.as_bytes());
        hasher.update(model.as_bytes());
        let hash = hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect::<String>();

        let cache_row = sqlx::query("SELECT response_json FROM ai_cache WHERE request_hash = ?")
            .bind(&hash)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = cache_row {
            let res: String = row.get("response_json");
            return Ok(res);
        }

        let key = Self::get_api_key(pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, key);
        eprintln!("[DEBUG] KEY PREFIX: {}", key.chars().take(7).collect::<String>());
        
        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": system_instruction }]
            },
            "contents": [{
                "parts": [{ "text": prompt }]
            }]
        });

        let retries = 0;
        let max_retries = 3;
        
        let res = loop {
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if !res.status().is_success() {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                eprintln!("GEMINI TEXT API ERROR {status}: {body}");
                
                if status.as_u16() == 429 && retries < max_retries {
                    let mut delay_secs = 30;
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                        if let Some(details) = json.get("error").and_then(|e| e.get("details")).and_then(|d| d.as_array()) {
                            for detail in details {
                                if let Some(t) = detail.get("@type").and_then(|t| t.as_str()) {
                                    if t == "type.googleapis.com/google.rpc.RetryInfo" {
                                        if let Some(delay_str) = detail.get("retryDelay").and_then(|d| d.as_str()) {
                                            if let Some(s) = delay_str.strip_suffix('s') {
                                                if let Ok(s_float) = s.parse::<f64>() {
                                                    delay_secs = s_float.ceil() as u64 + 1;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    eprintln!("Rate limit hit (429). Immediately aborting to trigger AI provider fallback.");
                    return Err(AppError::Internal(format!("API Rate Limit (429) hit. Retry delayed by {} seconds.", delay_secs)));
                }
                
                if status.as_u16() == 404 && body.contains("is not found") {
                    eprintln!("Attempting dynamic fallback to find available models...");
                    let list_url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", key);
                    if let Ok(list_res) = client.get(&list_url).send().await {
                        if let Ok(list_body) = list_res.json::<serde_json::Value>().await {
                            if let Some(models) = list_body.get("models").and_then(|m| m.as_array()) {
                                for m in models {
                                    if let Some(methods) = m.get("supportedGenerationMethods").and_then(|m| m.as_array()) {
                                        if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                            if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                                let new_model = name.strip_prefix("models/").unwrap_or(name);
                                                eprintln!("Found supported model: {}, retrying...", new_model);
                                                let new_url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", new_model, key);
                                                if let Ok(retry_res) = client.post(&new_url).json(&payload).send().await {
                                                    if retry_res.status().is_success() {
                                                        if let Ok(retry_body) = retry_res.json::<serde_json::Value>().await {
                                                            let text = retry_body.get("candidates").and_then(|c| c.get(0)).and_then(|c| c.get("content")).and_then(|c| c.get("parts")).and_then(|p| p.get(0)).and_then(|p| p.get("text")).and_then(|t| t.as_str()).unwrap_or_default().to_string();
                                                            return Ok(text);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return Err(crate::error::AppError::Internal(format!("API Error {status}: {body}")));
            }
            break res;
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body.get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or_default();
        
        let result = text.to_string();
        let _ = sqlx::query("INSERT INTO ai_cache (id, request_hash, response_json, created_at) VALUES (?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(&hash)
            .bind(&result)
            .bind(chrono::Utc::now().to_rfc3339())
            .execute(pool)
            .await;

        Ok(result)
    }

    /// Generate content with inline image parts (multimodal).
    /// `image_parts`: list of (base64_png, mime_type) tuples.
    pub async fn generate_multimodal(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        Self::generate_multimodal_with_model(prompt, system_instruction, image_parts, pool, "gemini-2.0-flash-lite").await
    }

    pub async fn generate_multimodal_with_model(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
        model: &str,
    ) -> AppResult<String> {
        Self::generate_multimodal_with_model_direct(prompt, system_instruction, image_parts, pool, model).await
    }

    pub async fn generate_multimodal_with_model_direct(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
        model: &str,
    ) -> AppResult<String> {
        let mut hasher = Sha256::new();
        hasher.update(prompt.as_bytes());
        hasher.update(system_instruction.as_bytes());
        hasher.update(model.as_bytes());
        for (b64, mime) in image_parts {
            hasher.update(b64.as_bytes());
            hasher.update(mime.as_bytes());
        }
        let hash_bytes = hasher.finalize();
        let hash = hash_bytes.iter().map(|b| format!("{:02x}", b)).collect::<String>();

        let cache_row = sqlx::query("SELECT response_json FROM ai_cache WHERE request_hash = ?")
            .bind(&hash)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = cache_row {
            let res: String = row.get("response_json");
            return Ok(res);
        }

        let key = Self::get_api_key(pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, key);

        let mut content_parts = vec![];
        for (part1, part2) in image_parts {
            let (b64, mime) = if part1.starts_with("image/") || part1.starts_with("audio/") || part1.starts_with("video/") {
                (part2, part1)
            } else {
                (part1, part2)
            };
            content_parts.push(serde_json::json!({
                "inlineData": { "mimeType": mime, "data": b64 }
            }));
        }
        content_parts.push(serde_json::json!({ "text": prompt }));

        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": system_instruction }]
            },
            "contents": [{
                "parts": content_parts
            }]
        });

        let retries = 0;
        let max_retries = 3;
        
        let res = loop {
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if !res.status().is_success() {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                eprintln!("GEMINI MULTIMODAL API ERROR {status}: {body}");

                if status.as_u16() == 429 && retries < max_retries {
                    let mut delay_secs = 30;
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                        if let Some(details) = json.get("error").and_then(|e| e.get("details")).and_then(|d| d.as_array()) {
                            for detail in details {
                                if let Some(t) = detail.get("@type").and_then(|t| t.as_str()) {
                                    if t == "type.googleapis.com/google.rpc.RetryInfo" {
                                        if let Some(delay_str) = detail.get("retryDelay").and_then(|d| d.as_str()) {
                                            if let Some(s) = delay_str.strip_suffix('s') {
                                                if let Ok(s_float) = s.parse::<f64>() {
                                                    delay_secs = s_float.ceil() as u64 + 1;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    eprintln!("Rate limit hit (429) multimodal. Immediately aborting to trigger AI provider fallback.");
                    return Err(AppError::Internal(format!("API Rate Limit (429) hit. Retry delayed by {} seconds.", delay_secs)));
                }

                if status.as_u16() == 404 && body.contains("is not found") {
                    eprintln!("Attempting dynamic fallback to find available models for multimodal...");
                    let list_url = format!("https://generativelanguage.googleapis.com/v1/models?key={}", key);
                    if let Ok(list_res) = client.get(&list_url).send().await {
                        if let Ok(list_body) = list_res.json::<serde_json::Value>().await {
                            if let Some(models) = list_body.get("models").and_then(|m| m.as_array()) {
                                for m in models {
                                    if let Some(methods) = m.get("supportedGenerationMethods").and_then(|m| m.as_array()) {
                                        if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                            if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                                let new_model = name.strip_prefix("models/").unwrap_or(name);
                                                eprintln!("Found supported model: {}, retrying multimodal...", new_model);
                                                let new_url = format!("https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}", new_model, key);
                                                if let Ok(retry_res) = client.post(&new_url).json(&payload).send().await {
                                                    if retry_res.status().is_success() {
                                                        if let Ok(retry_body) = retry_res.json::<serde_json::Value>().await {
                                                            let text = retry_body.get("candidates").and_then(|c| c.get(0)).and_then(|c| c.get("content")).and_then(|c| c.get("parts")).and_then(|p| p.get(0)).and_then(|p| p.get("text")).and_then(|t| t.as_str()).unwrap_or_default().to_string();
                                                            return Ok(text);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return Err(AppError::Internal(format!("API Error {status}: {body}")));
            }
            break res;
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body.get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or_default();

        let result = text.to_string();

        let _ = sqlx::query("INSERT INTO ai_cache (id, request_hash, response_json, created_at) VALUES (?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(hash)
            .bind(&result)
            .bind(chrono::Utc::now().to_rfc3339())
            .execute(pool)
            .await;

        Ok(result)
    }

    /// Generate an embedding vector for a text string.
    /// Stored as a BLOB of little-endian float32 values.
    pub async fn embed_text(text: &str, pool: &sqlx::SqlitePool) -> AppResult<Vec<f32>> {
        let key = Self::get_api_key(pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!(
            "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key={}",
            key
        );

        let payload = serde_json::json!({
            "model": "models/text-embedding-004",
            "content": { "parts": [{ "text": text }] }
        });

        let mut retries = 0;
        let res = loop {
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if res.status().is_success() {
                break res;
            } else if (res.status().as_u16() == 429 || res.status().is_server_error()) && retries < 3 {
                retries += 1;
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                continue;
            } else {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Embedding API Error {status}: {body}")));
            }
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let values = body["embedding"]["values"]
            .as_array()
            .ok_or_else(|| AppError::Internal("No embedding values in response".into()))?;

        let floats: Vec<f32> = values
            .iter()
            .filter_map(|v| v.as_f64().map(|f| f as f32))
            .collect();

        Ok(floats)
    }

    /// Grounded chat with exact refusal string when context is empty.
    /// Returns (response_text, parsed_references).
    pub async fn stream_chat_grounded(
        app: &AppHandle,
        lecture_id: &str,
        prompt: &str,
        history: &[ChatMessage],
    ) -> AppResult<Vec<ChatReference>> {
        let pool = app.state::<crate::database::DbState>().pool.clone();

        // 1. Try to get the massive lecture_intelligence artifact
        let intelligence_row = sqlx::query!(
            "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done' ORDER BY version DESC LIMIT 1",
            lecture_id
        )
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let text_context = if let Some(row) = intelligence_row {
            let parsed: serde_json::Value = serde_json::from_str(&row.content_json)
                .unwrap_or_else(|_| serde_json::json!({}));
            
            // Extract the highly optimized chat context field, fallback to full stringified JSON if missing
            if let Some(chat_ctx) = parsed.get("ai_chat_context").and_then(|v| v.as_str()) {
                chat_ctx.to_string()
            } else {
                row.content_json
            }
        } else {
            // Fallback to legacy context builder
            let ctx = crate::ai::context_builder::ContextBuilder::build_text_only(&pool, lecture_id).await?;
            crate::ai::context_builder::ContextBuilder::format_text_context(&ctx)
        };

        let system = format!(
            "You are an expert AI Tutor designed to help students master this lecture material. \
             Your goal is not just to give answers, but to foster deep understanding.\n\n\
             TUTORING GUIDELINES:\n\
             1. **Socratic Approach**: Don't just hand out flat answers. Explain concepts step-by-step, use analogies, and occasionally ask guiding questions to check for understanding.\n\
             2. **Clarity**: Break down complex topics into digestible parts. Adapt your tone to be encouraging and academic.\n\
             3. **Grounding**: You MUST base your explanations strictly on the provided lecture intelligence. \
             If the requested information is genuinely not present (confidence < 40%), clearly state: \
             'I cannot find that specifically in the lecture content, but here is what I know generally...' \n\
             4. **Citations**: When you reference a specific part of the lecture, always include a marker like \
             [REF:timestamp:12345] or [REF:screenshot:screenshot_id] in your response.\n\n\
             LECTURE CONTENT:\n{}",
            text_context
        );

        let key = Self::get_api_key(&pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key={}", key);
        
        let mut contents = Vec::new();
        for msg in history {
            let role = if msg.role == "user" { "user" } else { "model" };
            contents.push(serde_json::json!({
                "role": role,
                "parts": [{ "text": msg.content }]
            }));
        }
        // Ensure last message is the current prompt
        if history.last().map(|m| m.role.as_str()) != Some("user") || 
           history.last().map(|m| m.content.as_str()) != Some(prompt) {
            contents.push(serde_json::json!({
                "role": "user",
                "parts": [{ "text": prompt }]
            }));
        }

        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": system }]
            },
            "contents": contents
        });

        let mut retries = 0;
        let res = loop {
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if res.status().is_success() {
                break res;
            } else if (res.status().as_u16() == 429 || res.status().is_server_error()) && retries < 2 {
                retries += 1;
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                continue;
            } else {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Chat API Error {status}: {body}")));
            }
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body.get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or(REFUSAL_STRING);

        // Parse references from the response
        let references = Self::parse_references(text);

        // Strip reference markers for clean display
        let clean_text = Self::strip_references(text);

        app.emit("ai_chat_chunk", serde_json::json!({ "chunk": clean_text, "references": references }))
           .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(references)
    }

    pub fn parse_references_pub(text: &str) -> Vec<ChatReference> {
        Self::parse_references(text)
    }

    pub fn strip_references_pub(text: &str) -> String {
        Self::strip_references(text)
    }

    pub async fn get_api_key_from_pool(pool: &sqlx::SqlitePool) -> AppResult<String> {
        Self::get_api_key(pool).await
    }

    /// Parse [REF:type:value] markers from AI response.
    fn parse_references(text: &str) -> Vec<ChatReference> {
        let mut refs = Vec::new();
        let mut remaining = text;
        while let Some(start) = remaining.find("[REF:") {
            let after = &remaining[start + 5..];
            if let Some(end) = after.find(']') {
                let inner = &after[..end];
                let parts: Vec<&str> = inner.splitn(2, ':').collect();
                if parts.len() == 2 {
                    refs.push(ChatReference {
                        ref_type: parts[0].to_string(),
                        value: parts[1].to_string(),
                    });
                }
                remaining = &after[end + 1..];
            } else {
                break;
            }
        }
        refs
    }

    fn strip_references(text: &str) -> String {
        let mut result = text.to_string();
        while let Some(start) = result.find("[REF:") {
            if let Some(end) = result[start..].find(']') {
                result.drain(start..start + end + 1);
            } else {
                break;
            }
        }
        result.trim().to_string()
    }

    /// Legacy stream_chat kept for backward compatibility (non-grounded).
    pub async fn stream_chat(app: &AppHandle, prompt: &str, history: &[ChatMessage]) -> AppResult<()> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        let key = Self::get_api_key(&pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key={}", key);
        
        let mut contents = Vec::new();
        for msg in history {
            let role = if msg.role == "user" { "user" } else { "model" };
            contents.push(serde_json::json!({
                "role": role,
                "parts": [{ "text": msg.content }]
            }));
        }
        if let Some(last) = history.last() {
            if last.role != "user" || last.content != prompt {
                contents.push(serde_json::json!({
                    "role": "user",
                    "parts": [{ "text": prompt }]
                }));
            }
        } else {
            contents.push(serde_json::json!({
                "role": "user",
                "parts": [{ "text": prompt }]
            }));
        }

        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": "You are a helpful assistant for a student studying their lecture." }]
            },
            "contents": contents
        });

        let mut retries = 0;
        let res = loop {
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if res.status().is_success() {
                break res;
            } else if (res.status().as_u16() == 429 || res.status().is_server_error()) && retries < 2 {
                retries += 1;
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                continue;
            } else {
                let status = res.status();
                let text = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("API Error {}: {}", status, text)));
            }
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body.get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or_default();
                app.emit("ai_chat_chunk", serde_json::json!({ "chunk": text }))
           .map_err(|e| AppError::Internal(e.to_string()))?;
           
        Ok(())
    }

    pub async fn upload_file(file_path: &std::path::Path, mime_type: &str, app: &AppHandle) -> AppResult<String> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        let key = Self::get_api_key(&pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key={}", key);
        
        let file_bytes = tokio::fs::read(file_path).await.map_err(|e| AppError::Internal(e.to_string()))?;
        
        let mut retries = 0;
        let res = loop {
            let res = client.post(&url)
                .header("X-Goog-Upload-Protocol", "raw")
                .header("Content-Type", mime_type)
                .body(file_bytes.clone())
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
                
            if res.status().is_success() {
                break res;
            } else if res.status().as_u16() == 429 || res.status().is_server_error() {
                if retries < 4 {
                    retries += 1;
                    tokio::time::sleep(tokio::time::Duration::from_secs(15 * retries)).await;
                    continue;
                } else {
                    return Err(AppError::Internal("Upload Failed: AI API Rate Limit or Server Error exceeded. Please wait a minute and try again.".into()));
                }
            } else {
                return Err(AppError::Internal(format!("Upload API Error: {}", res.status())));
            }
        };
        
        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let file_uri = body.get("file").and_then(|f| f.get("uri")).and_then(|u| u.as_str()).unwrap_or_default();
        let file_name = body.get("file").and_then(|f| f.get("name")).and_then(|n| n.as_str()).unwrap_or_default();
        
        let mut status_retries = 0;
        let start_time = std::time::Instant::now();
        loop {
            if start_time.elapsed() > std::time::Duration::from_secs(300) {
                return Err(AppError::Internal("Gemini file processing timed out after 5 minutes".into()));
            }

            let get_url = format!("https://generativelanguage.googleapis.com/v1beta/{}?key={}", file_name, key);
            let get_res = client.get(&get_url).send().await.map_err(|e| AppError::Internal(e.to_string()))?;
            
            if !get_res.status().is_success() {
                let status = get_res.status();
                if status.as_u16() == 429 && status_retries < 5 {
                    status_retries += 1;
                    tokio::time::sleep(tokio::time::Duration::from_secs(10 * status_retries)).await;
                    continue;
                }
                let body = get_res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("File Status API Error {status}: {body}")));
            }

            let get_body: serde_json::Value = get_res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
            if let Some(err) = get_body.get("error") {
                return Err(AppError::Internal(format!("Gemini file status returned error: {:?}", err)));
            }

            let state = get_body.get("state").and_then(|s| s.as_str()).unwrap_or_default();
            if state == "ACTIVE" {
                break;
            } else if state == "FAILED" {
                return Err(AppError::Internal("Gemini File processing failed".into()));
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }

        Ok(file_uri.to_string())
    }

    pub async fn transcribe_file(file_uri: &str, mime_type: &str, app: &AppHandle) -> AppResult<String> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        let key = Self::get_api_key(&pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        
        let models = match Self::discover_available_models(&pool).await {
            Ok(list) if !list.is_empty() => list,
            _ => vec![
                "gemini-3.5-flash-lite".to_string(),
                "gemini-3.5-flash".to_string(),
                "gemini-flash-latest".to_string(),
                "gemini-3.7-flash".to_string(),
                "gemini-2.0-flash".to_string(),
                "gemini-1.5-flash".to_string(),
            ]
        };

        let payload = serde_json::json!({
            "contents": [{
                "parts": [
                    { "fileData": { "mimeType": mime_type, "fileUri": file_uri } },
                    { "text": "Please provide a complete, detailed, word-for-word transcript of the entire audio in this file. Transcribe all spoken dialogue and speech in full in its native script without summarizing or omitting anything." }
                ]
            }]
        });

        let mut last_err = String::new();
        for model in &models {
            let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, key);
            if let Ok(res) = client.post(&url).json(&payload).send().await {
                if res.status().is_success() {
                    if let Ok(body) = res.json::<serde_json::Value>().await {
                        let text = body.get("candidates")
                            .and_then(|c| c.get(0))
                            .and_then(|c| c.get("content"))
                            .and_then(|c| c.get("parts"))
                            .and_then(|p| p.get(0))
                            .and_then(|p| p.get("text"))
                            .and_then(|t| t.as_str())
                            .unwrap_or_default();
                        let trimmed = text.trim();
                        if !trimmed.is_empty() {
                            return Ok(trimmed.to_string());
                        }
                    }
                } else {
                    last_err = format!("Status {}", res.status());
                }
            }
        }
        
        Err(AppError::Internal(format!("Audio transcription failed across all Gemini models. Last error: {}", last_err)))
    }

    pub async fn transcribe_audio_chunk(
        audio_base64: &str,
        mime_type: &str,
        language_hint: Option<String>,
        app: &AppHandle,
    ) -> AppResult<serde_json::Value> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .unwrap_or_else(|_| Client::new());

        // Resolve language hints: ISO-639-1 code for Whisper, Native language name for Gemini
        let (iso_lang, lang_desc) = match language_hint.as_deref().map(|s| s.to_lowercase()) {
            Some(ref s) if s == "hindi" || s == "hi" || s == "hi-in" => (Some("hi"), "Hindi (हिंदी) in Devanagari script"),
            Some(ref s) if s == "telugu" || s == "te" || s == "te-in" => (Some("te"), "Telugu (తెలుగు) in Telugu script"),
            Some(ref s) if s == "tamil" || s == "ta" || s == "ta-in" => (Some("ta"), "Tamil (தமிழ்) in Tamil script"),
            Some(ref s) if s == "kannada" || s == "kn" || s == "kn-in" => (Some("kn"), "Kannada (ಕನ್ನಡ) in Kannada script"),
            Some(ref s) if s == "malayalam" || s == "ml" || s == "ml-in" => (Some("ml"), "Malayalam (മലയാളം) in Malayalam script"),
            Some(ref s) if s == "marathi" || s == "mr" || s == "mr-in" => (Some("mr"), "Marathi (मराठी) in Devanagari script"),
            Some(ref s) if s == "bengali" || s == "bn" || s == "bn-in" => (Some("bn"), "Bengali (বাংলা) in Bengali script"),
            Some(ref s) if s == "gujarati" || s == "gu" || s == "gu-in" => (Some("gu"), "Gujarati (ગુજરાતી) in Gujarati script"),
            Some(ref s) if s == "punjabi" || s == "pa" || s == "pa-in" => (Some("pa"), "Punjabi (ਪੰਜਾਬੀ) in Gurmukhi script"),
            Some(ref s) if s == "spanish" || s == "es" || s == "es-es" => (Some("es"), "Spanish (Español)"),
            Some(ref s) if s == "french" || s == "fr" || s == "fr-fr" => (Some("fr"), "French (Français)"),
            Some(ref s) if s == "german" || s == "de" || s == "de-de" => (Some("de"), "German (Deutsch)"),
            Some(ref s) if s == "portuguese" || s == "pt" || s == "pt-pt" => (Some("pt"), "Portuguese (Português)"),
            Some(ref s) if s == "italian" || s == "it" || s == "it-it" => (Some("it"), "Italian (Italiano)"),
            Some(ref s) if s == "russian" || s == "ru" || s == "ru-ru" => (Some("ru"), "Russian (Русский)"),
            Some(ref s) if s == "japanese" || s == "ja" || s == "ja-jp" => (Some("ja"), "Japanese (日本語)"),
            Some(ref s) if s == "chinese" || s == "zh" || s == "zh-cn" => (Some("zh"), "Chinese (中文)"),
            Some(ref s) if s == "korean" || s == "ko" || s == "ko-kr" => (Some("ko"), "Korean (한국어)"),
            Some(ref s) if s == "arabic" || s == "ar" || s == "ar-sa" => (Some("ar"), "Arabic (العربية)"),
            Some(ref s) if s == "english" || s == "en" || s == "en-us" || s == "english-in" || s == "en-in" => (Some("en"), "English"),
            _ => (None, "the spoken language in its original native script"),
        };

        let (ext, clean_mime) = if mime_type.contains("webm") {
            ("audio.webm", "audio/webm")
        } else if mime_type.contains("mp4") {
            ("audio.mp4", "audio/mp4")
        } else {
            ("audio.wav", "audio/wav")
        };

        // 1. Try Groq Whisper (Whisper Large v3 Turbo - 2000 RPD, Free & Ultra-Fast)
        let groq_candidate_keys = ["groq_api_key", "groqApiKey", "groq", "bacham.groq"];
        let mut groq_key_opt: Option<String> = None;
        if let Ok(entry) = Entry::new("bacham", "groq_api_key") {
            if let Ok(k) = entry.get_password() {
                if !k.trim().is_empty() { groq_key_opt = Some(k.trim().to_string()); }
            }
        }
        if groq_key_opt.is_none() {
            if let Ok(env_k) = std::env::var("GROQ_API_KEY") {
                if !env_k.trim().is_empty() { groq_key_opt = Some(env_k.trim().to_string()); }
            }
        }
        if groq_key_opt.is_none() {
            for gk in groq_candidate_keys {
                if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
                    .bind(gk)
                    .fetch_optional(&pool)
                    .await 
                {
                    let val: String = row.get("value");
                    let trimmed = val.trim().to_string();
                    if !trimmed.is_empty() && trimmed != "true" {
                        groq_key_opt = Some(trimmed);
                        break;
                    }
                }
            }
        }

        if let Some(groq_key) = groq_key_opt {
            use base64::Engine;
            if let Ok(audio_bytes) = base64::engine::general_purpose::STANDARD.decode(audio_base64) {
                if !audio_bytes.is_empty() {
                    let part = reqwest::multipart::Part::bytes(audio_bytes)
                        .file_name(ext)
                        .mime_str(clean_mime)
                        .unwrap();

                    let mut form = reqwest::multipart::Form::new()
                        .part("file", part)
                        .text("model", "whisper-large-v3-turbo")
                        .text("response_format", "verbose_json");

                    if let Some(iso) = iso_lang {
                        form = form.text("language", iso);
                    }

                    if let Ok(res) = client.post("https://api.groq.com/openai/v1/audio/transcriptions")
                        .header("Authorization", format!("Bearer {}", groq_key))
                        .multipart(form)
                        .send()
                        .await 
                    {
                        if res.status().is_success() {
                            if let Ok(body) = res.json::<serde_json::Value>().await {
                                if let Some(text) = body.get("text").and_then(|t| t.as_str()) {
                                    let trimmed = text.trim();
                                    if !trimmed.is_empty() && trimmed != "00:00" && trimmed != "0:00" && !trimmed.to_lowercase().starts_with("subtitles") {
                                        let lang = body.get("language").and_then(|l| l.as_str()).unwrap_or("Auto");
                                        return Ok(serde_json::json!({
                                            "text": trimmed,
                                            "language": lang,
                                            "flag": "🌐"
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Try OpenAI Whisper (if configured)
        let openai_candidate_keys = ["openai_api_key", "openaiApiKey", "openai", "bacham.openai"];
        let mut openai_key_opt: Option<String> = None;
        if let Ok(entry) = Entry::new("bacham", "openai_api_key") {
            if let Ok(k) = entry.get_password() {
                if !k.trim().is_empty() { openai_key_opt = Some(k.trim().to_string()); }
            }
        }
        if openai_key_opt.is_none() {
            if let Ok(env_k) = std::env::var("OPENAI_API_KEY") {
                if !env_k.trim().is_empty() { openai_key_opt = Some(env_k.trim().to_string()); }
            }
        }
        if openai_key_opt.is_none() {
            for ok in openai_candidate_keys {
                if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
                    .bind(ok)
                    .fetch_optional(&pool)
                    .await 
                {
                    let val: String = row.get("value");
                    let trimmed = val.trim().to_string();
                    if !trimmed.is_empty() && trimmed != "true" {
                        openai_key_opt = Some(trimmed);
                        break;
                    }
                }
            }
        }

        if let Some(openai_key) = openai_key_opt {
            use base64::Engine;
            if let Ok(audio_bytes) = base64::engine::general_purpose::STANDARD.decode(audio_base64) {
                if !audio_bytes.is_empty() {
                    let part = reqwest::multipart::Part::bytes(audio_bytes)
                        .file_name(ext)
                        .mime_str(clean_mime)
                        .unwrap();

                    let mut form = reqwest::multipart::Form::new()
                        .part("file", part)
                        .text("model", "whisper-1")
                        .text("response_format", "verbose_json");

                    if let Some(iso) = iso_lang {
                        form = form.text("language", iso);
                    }

                    if let Ok(res) = client.post("https://api.openai.com/v1/audio/transcriptions")
                        .header("Authorization", format!("Bearer {}", openai_key))
                        .multipart(form)
                        .send()
                        .await 
                    {
                        if res.status().is_success() {
                            if let Ok(body) = res.json::<serde_json::Value>().await {
                                if let Some(text) = body.get("text").and_then(|t| t.as_str()) {
                                    let trimmed = text.trim();
                                    if !trimmed.is_empty() && trimmed != "00:00" && trimmed != "0:00" && !trimmed.to_lowercase().starts_with("subtitles") {
                                        let lang = body.get("language").and_then(|l| l.as_str()).unwrap_or("Auto");
                                        return Ok(serde_json::json!({
                                            "text": trimmed,
                                            "language": lang,
                                            "flag": "🌐"
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Try Google Gemini Flash Models (Direct Verbatim Transcription in Native Script)
        if let Ok(key) = Self::get_api_key(&pool).await {
            let candidate_models = [
                "gemini-3.5-flash-lite",
                "gemini-3.5-flash",
                "gemini-flash-latest",
            ];

            let prompt_text = format!(
                "Transcribe the spoken audio verbatim in {}. \
                CRITICAL: Do NOT translate to English. Write ONLY the exact words spoken in their native script. \
                Do not add notes, timestamps, or formatting. Output ONLY the raw spoken words. If there is no clear speech, output nothing.",
                lang_desc
            );

            let payload = serde_json::json!({
                "contents": [{
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": clean_mime,
                                "data": audio_base64
                            }
                        },
                        { "text": prompt_text }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.0
                }
            });

            for model in &candidate_models {
                let url = format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                    model, key
                );
                if let Ok(res) = client.post(&url).json(&payload).send().await {
                    if res.status().is_success() {
                        if let Ok(body) = res.json::<serde_json::Value>().await {
                            if let Some(raw_text) = body.get("candidates")
                                .and_then(|c| c.get(0))
                                .and_then(|c| c.get("content"))
                                .and_then(|c| c.get("parts"))
                                .and_then(|p| p.get(0))
                                .and_then(|p| p.get("text"))
                                .and_then(|t| t.as_str()) {
                                    let trimmed = raw_text.trim();
                                    let lower = trimmed.to_lowercase();
                                    if !trimmed.is_empty() 
                                        && trimmed != "00:00" 
                                        && trimmed != "0:00" 
                                        && trimmed != "00:01" 
                                        && !lower.starts_with("subtitles") 
                                        && !lower.starts_with("<noise") 
                                        && !lower.starts_with("[noise") 
                                        && !lower.starts_with("[silence")
                                        && lower != "<noise>"
                                        && lower != "[noise]"
                                        && lower != "[silence]"
                                    {
                                        return Ok(serde_json::json!({
                                            "text": trimmed,
                                            "language": "",
                                            "flag": ""
                                        }));
                                    }
                            }
                        }
                    }
                }
            }
        }

        Ok(serde_json::json!({ "text": "", "language": "", "flag": "" }))
    }

    pub async fn generate_tutor_action(
        app: &AppHandle,
        lecture_id: &str,
        action_type: &str,
        target_id: Option<&str>,
        target_text: Option<&str>,
    ) -> AppResult<String> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        
        let prompt_prefix = match action_type {
            "explain" => "Explain the following in detail:",
            "simplify" => "Simplify this concept so a beginner can understand it:",
            "examples" => "Provide concrete examples for the following:",
            "visual" => "Explain how you would visualize this concept:",
            "math" => "Explain the mathematical intuition behind this:",
            "exam_prep" => "Explain this from the perspective of preparing for a difficult exam:",
            "explain_code" => "Explain this code snippet line by line, focusing on its purpose in the lecture:",
            "explain_formula" => "Explain this mathematical formula, define all its variables, and describe its intuition:",
            _ => "Explain the following:",
        };

        let target_id_str = target_id.unwrap_or("");
        let target_text_str = target_text.unwrap_or("");
        
        let user_prompt = format!("{}\n\n{}", prompt_prefix, target_text_str);

        let mut hasher = Sha256::new();
        hasher.update(lecture_id.as_bytes());
        hasher.update(action_type.as_bytes());
        hasher.update(target_id_str.as_bytes());
        hasher.update(target_text_str.as_bytes());
        let hash_bytes = hasher.finalize();
        let hash = hash_bytes.iter().map(|b| format!("{:02x}", b)).collect::<String>();

        let cache_row = sqlx::query("SELECT response_json FROM ai_cache WHERE request_hash = ?")
            .bind(&hash)
            .fetch_optional(&pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = cache_row {
            let cached_response = sqlx::Row::get::<String, _>(&row, "response_json");
            if !cached_response.is_empty() {
                return Ok(cached_response);
            }
        }

        let intelligence_row = sqlx::query!(
            "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done' ORDER BY version DESC LIMIT 1",
            lecture_id
        )
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let text_context = if let Some(row) = intelligence_row {
            let parsed: serde_json::Value = serde_json::from_str(&row.content_json)
                .unwrap_or_else(|_| serde_json::json!({}));
            if let Some(chat_ctx) = parsed.get("ai_chat_context").and_then(|v| v.as_str()) {
                chat_ctx.to_string()
            } else {
                row.content_json
            }
        } else {
            let ctx = crate::ai::context_builder::ContextBuilder::build_text_only(&pool, lecture_id).await?;
            crate::ai::context_builder::ContextBuilder::format_text_context(&ctx)
        };

        let system = format!(
            "You are an expert AI Tutor. Use the provided lecture intelligence to ground your explanation. \
             LECTURE CONTENT:\n{}",
            text_context
        );

        let key = Self::get_api_key(&pool).await?;
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| Client::new());
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}", key);
        
        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": system }]
            },
            "contents": [{
                "role": "user",
                "parts": [{ "text": user_prompt }]
            }]
        });

        let mut retries = 0;
        let res = loop {
            let res = client.post(&url).json(&payload).send().await.map_err(|e| AppError::Internal(e.to_string()))?;
            if res.status().is_success() {
                break res;
            } else if (res.status().as_u16() == 429 || res.status().is_server_error()) && retries < 2 {
                retries += 1;
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                continue;
            } else {
                return Err(AppError::Internal(format!("API Error {}: {}", res.status(), res.text().await.unwrap_or_default())));
            }
        };

        let body: serde_json::Value = res.json().await.map_err(|e| AppError::Internal(e.to_string()))?;
        let text = body.get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or_default()
            .to_string();

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = sqlx::query("INSERT INTO ai_cache (id, request_hash, response_json, created_at) VALUES (?, ?, ?, ?)")
            .bind(&id).bind(&hash).bind(&text).bind(&now)
            .execute(&pool).await;

        Ok(text)
    }
}

#[tokio::test] 
async fn test_print_models() { 
 let entry = keyring::Entry::new("bacham", "gemini_api_key").unwrap(); 
 let key = entry.get_password().unwrap_or_else(|_| std::env::var("GEMINI_API_KEY").unwrap_or_default()); 
 let url = format!("https://generativelanguage.googleapis.com/v1/models?key={}", key); 
 let res = reqwest::get(&url).await.unwrap().text().await.unwrap(); 
 println!("MODELS: {}", res); 
}
