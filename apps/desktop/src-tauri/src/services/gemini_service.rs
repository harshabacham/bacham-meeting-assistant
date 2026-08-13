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
        let entry = Entry::new("bacham", "gemini_api_key").map_err(|e| AppError::Internal(e.to_string()))?;
        
        if let Ok(key) = entry.get_password() {
            if !key.trim().is_empty() {
                return Ok(key.trim().to_string());
            }
        }

        if let Ok(env_key) = std::env::var("GEMINI_API_KEY") {
            if !env_key.trim().is_empty() {
                return Ok(env_key.trim().to_string());
            }
        }
        
        // Migration fallback: check SQLite
        let row = sqlx::query("SELECT value FROM settings WHERE key = 'gemini_api_key'")
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
            
        if let Some(r) = row {
            let key = sqlx::Row::get::<String, _>(&r, "value");
            let key = key.trim().to_string();
            if !key.is_empty() {
                // Migrate to keyring if possible, but keep it in DB for dev reliability
                if let Ok(entry) = Entry::new("bacham", "gemini_api_key") {
                    let _ = entry.set_password(&key);
                }
                return Ok(key);
            }
        }
        
        Err(AppError::Internal("No API Key set".into()))
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
        _model: &str,
    ) -> AppResult<String> {
        crate::services::universal_ai::UniversalAiService::generate_text(prompt, system_instruction, pool).await
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
        let url = format!("https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}", model, key);
        
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
                    let list_url = format!("https://generativelanguage.googleapis.com/v1/models?key={}", key);
                    if let Ok(list_res) = client.get(&list_url).send().await {
                        if let Ok(list_body) = list_res.json::<serde_json::Value>().await {
                            if let Some(models) = list_body.get("models").and_then(|m| m.as_array()) {
                                for m in models {
                                    if let Some(methods) = m.get("supportedGenerationMethods").and_then(|m| m.as_array()) {
                                        if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                            if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                                let new_model = name.strip_prefix("models/").unwrap_or(name);
                                                eprintln!("Found supported model: {}, retrying...", new_model);
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
        _model: &str,
    ) -> AppResult<String> {
        crate::services::universal_ai::UniversalAiService::generate_multimodal(prompt, system_instruction, image_parts, pool).await
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
        let url = format!("https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}", model, key);

        let mut content_parts = vec![];
        for (b64, mime) in image_parts {
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
        let url = format!("https://generativelanguage.googleapis.com/upload/v1/files?uploadType=media&key={}", key);
        
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

            let get_url = format!("https://generativelanguage.googleapis.com/v1/{}?key={}", file_name, key);
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
        let url = format!("https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key={}", key);
        
        let payload = serde_json::json!({
            "contents": [{
                "parts": [
                    { "fileData": { "mimeType": mime_type, "fileUri": file_uri } },
                    { "text": "Please provide a detailed, accurate transcript of the audio in this file. Include no other conversational filler, just the transcript." }
                ]
            }]
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
            } else if res.status().as_u16() == 429 || res.status().is_server_error() {
                if retries < 4 {
                    retries += 1;
                    tokio::time::sleep(tokio::time::Duration::from_secs(20 * retries)).await;
                    continue;
                } else {
                    return Err(AppError::Internal("Transcription Failed: AI API Rate Limit or Server Error exceeded. Please wait a minute and try again.".into()));
                }
            } else {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Transcription API Error {status}: {body}")));
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
        
        Ok(text.to_string())
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
        let url = format!("https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key={}", key);
        
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
