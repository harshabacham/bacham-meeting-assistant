pub trait GoogleAuthExt { fn apply_google_auth(self, key: &str) -> Self; }
impl GoogleAuthExt for reqwest::RequestBuilder { fn apply_google_auth(self, key: &str) -> Self { if key.starts_with("ya29.") || key.starts_with("Bearer ") { let token = key.trim_start_matches("Bearer ").trim(); self.header("Authorization", format!("Bearer {}", token)) } else { self.header("x-goog-api-key", key) } } }
use async_trait::async_trait;
use tauri::{AppHandle, Manager, Emitter};
use crate::error::{AppError, AppResult};
use crate::services::gemini_service::{ChatMessage, ChatReference};
use crate::services::universal_ai::UniversalAiService;
use crate::services::provider_service::ProviderService;

pub struct GenerationRequest {
    pub system_instruction: String,
    pub history: Vec<ChatMessage>,
    pub prompt: String,
}

pub struct GenerationResponse {
    pub text: String,
    pub references: Vec<ChatReference>,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn generate_stream(&self, app: &AppHandle, request: GenerationRequest, event_name: &str) -> AppResult<GenerationResponse>;
    fn context_window(&self) -> usize;
}

pub struct ProviderEngine;

impl ProviderEngine {
    pub async fn get_provider(app: &AppHandle) -> AppResult<Box<dyn AiProvider>> {
        let pool = app.state::<crate::database::DbState>().pool.clone();
        let provider_name = UniversalAiService::get_active_provider(&pool).await;

        match provider_name.as_str() {
            "gemini" | "bacham.gemini" => Ok(Box::new(GeminiProvider)),
            "ollama" | "bacham.ollama" => Ok(Box::new(OllamaProvider { name: provider_name })),
            "openai" | "bacham.openai" | "openrouter" | "bacham.openrouter" | "lmstudio" | "bacham.lmstudio" | "anthropic" | "bacham.anthropic" | "grok" | "bacham.grok" => Ok(Box::new(OpenAiCompatibleProvider { name: provider_name })),
            _ => Ok(Box::new(OpenAiCompatibleProvider { name: provider_name })), // Fallback to OpenAI compatible for all other plugins
        }
    }
}

pub struct GeminiProvider;

#[async_trait]
impl AiProvider for GeminiProvider {
    async fn generate_stream(&self, app: &AppHandle, request: GenerationRequest, event_name: &str) -> AppResult<GenerationResponse> {
        let pool = &app.state::<crate::database::DbState>().pool;
        let key = ProviderService::get_api_key(pool, "gemini").await?;
        let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| reqwest::Client::new());
        let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse".to_string();
        
        let mut contents = Vec::new();
        for msg in &request.history {
            let role = if msg.role == "user" { "user" } else { "model" };
            contents.push(serde_json::json!({
                "role": role,
                "parts": [{ "text": msg.content }]
            }));
        }
        
        // Ensure last message is the current prompt
        if request.history.last().map(|m| m.role.as_str()) != Some("user") || 
           request.history.last().map(|m| m.content.as_str()) != Some(&request.prompt) {
            contents.push(serde_json::json!({
                "role": "user",
                "parts": [{ "text": request.prompt }]
            }));
        }

        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": request.system_instruction }]
            },
            "contents": contents
        });

        let mut retries = 0;
        let res = loop {
            let res = client.post(&url)
                .apply_google_auth(&key)
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
                
                // DYNAMIC FALLBACK
                if status.as_u16() == 404 && body.contains("is not found") {
                    eprintln!("Attempting dynamic fallback to find available models for streaming...");
                    let list_url = "https://generativelanguage.googleapis.com/v1beta/models".to_string();
                    if let Ok(list_res) = client.get(&list_url).apply_google_auth(&key).send().await {
                        if let Ok(list_body) = list_res.json::<serde_json::Value>().await {
                            if let Some(models) = list_body.get("models").and_then(|m| m.as_array()) {
                                let mut found_model = None;
                                for m in models {
                                    if let Some(methods) = m.get("supportedGenerationMethods").and_then(|m| m.as_array()) {
                                        if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                            if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                                found_model = Some(name.strip_prefix("models/").unwrap_or(name).to_string());
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                if let Some(new_model) = found_model {
                                    eprintln!("Found supported model: {}, retrying stream...", new_model);
                                    let new_url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse", new_model);
                                    if let Ok(retry_res) = client.post(&new_url).apply_google_auth(&key).json(&payload).send().await {
                                        if retry_res.status().is_success() {
                                            break retry_res;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                return Err(AppError::Internal(format!("API Error {status}: {body}")));
            }
        };

        use futures::stream::StreamExt;
        
        let mut full_text = String::new();
        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let mut text_buffer = String::new();
        let mut refs = Vec::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| AppError::Internal(e.to_string()))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(idx) = buffer.find('\n') {
                let line = buffer[..idx].trim().to_string();
                buffer.drain(..idx + 1);

                if line.starts_with("data: ") {
                    let data = &line["data: ".len()..];
                    if data == "[DONE]" { continue; }
                    
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(candidates) = parsed.get("candidates") {
                            if let Some(candidate) = candidates.get(0) {
                                if let Some(content) = candidate.get("content") {
                                    if let Some(parts) = content.get("parts") {
                                        if let Some(part) = parts.get(0) {
                                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                                text_buffer.push_str(text);
                                                
                                                // Check if text_buffer contains a potential reference tag
                                                let mut send_text = String::new();
                                                
                                                while !text_buffer.is_empty() {
                                                    if let Some(start) = text_buffer.find("[REF:") {
                                                        if let Some(end) = text_buffer[start..].find(']') {
                                                            let full_ref = &text_buffer[start..start + end + 1];
                                                            let inner = &full_ref[5..full_ref.len()-1];
                                                            let parts: Vec<&str> = inner.splitn(2, ':').collect();
                                                            if parts.len() == 2 {
                                                                refs.push(ChatReference {
                                                                    ref_type: parts[0].to_string(),
                                                                    value: parts[1].to_string(),
                                                                });
                                                            }
                                                            // Keep the ref tag in the text!
                                                            send_text.push_str(&text_buffer[..start + end + 1]);
                                                            text_buffer.drain(..start + end + 1);
                                                        } else {
                                                            send_text.push_str(&text_buffer[..start]);
                                                            text_buffer.drain(..start);
                                                            break; 
                                                        }
                                                    } else {
                                                        let mut break_out = false;
                                                        for i in (1..5).rev() {
                                                            if text_buffer.len() >= i && text_buffer.ends_with(&"[REF:"[..i]) {
                                                                let safe_len = text_buffer.len() - i;
                                                                send_text.push_str(&text_buffer[..safe_len]);
                                                                text_buffer.drain(..safe_len);
                                                                break_out = true;
                                                                break;
                                                            }
                                                        }
                                                        if !break_out {
                                                            send_text.push_str(&text_buffer);
                                                            text_buffer.clear();
                                                        }
                                                        break;
                                                    }
                                                }

                                                if !send_text.is_empty() {
                                                    full_text.push_str(&send_text);
                                                    let _ = app.emit(event_name, serde_json::json!({ "chunk": send_text, "references": refs }));
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
        
        if !text_buffer.is_empty() {
            full_text.push_str(&text_buffer);
            let _ = app.emit(event_name, serde_json::json!({ "chunk": text_buffer, "references": refs }));
        }

        Ok(GenerationResponse {
            text: full_text.trim().to_string(),
            references: refs,
        })
    }

    fn context_window(&self) -> usize {
        1_000_000 // 1 million tokens for Gemini 1.5/2.5 Flash
    }
}

pub struct OllamaProvider {
    pub name: String,
}

#[async_trait]
impl AiProvider for OllamaProvider {
    async fn generate_stream(&self, app: &AppHandle, request: GenerationRequest, event_name: &str) -> AppResult<GenerationResponse> {
        let pool = &app.state::<crate::database::DbState>().pool;
        let url = ProviderService::get_api_key(pool, &self.name).await.unwrap_or_else(|_| "http://localhost:11434".to_string());
        
        let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| reqwest::Client::new());
        
        let mut messages = Vec::new();
        if !request.system_instruction.is_empty() {
            messages.push(serde_json::json!({
                "role": "system",
                "content": request.system_instruction
            }));
        }
        
        for msg in &request.history {
            messages.push(serde_json::json!({
                "role": msg.role,
                "content": msg.content
            }));
        }
        
        if request.history.last().map(|m| m.role.as_str()) != Some("user") || 
           request.history.last().map(|m| m.content.as_str()) != Some(&request.prompt) {
            messages.push(serde_json::json!({
                "role": "user",
                "content": request.prompt
            }));
        }

        // We try to get the default_model from the database based on the plugin.
        // We strip "bacham." prefix to query ai_provider_configs correctly
        let raw_provider = self.name.strip_prefix("bacham.").unwrap_or(&self.name);
        
        let model = sqlx::query("SELECT default_model FROM ai_provider_configs WHERE provider = ?")
            .bind(raw_provider)
            .fetch_optional(pool)
            .await.ok().flatten().and_then(|r| sqlx::Row::try_get::<String, _>(&r, "default_model").ok())
            .unwrap_or_else(|| "llama3".to_string());

        let payload = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true
        });

        let endpoint = format!("{}/api/chat", url.trim_end_matches('/'));

        let res = client.post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Ollama API Error {status}: {body}")));
        }

        use futures::stream::StreamExt;
        
        let mut full_text = String::new();
        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let refs = Vec::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| AppError::Internal(e.to_string()))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(idx) = buffer.find('\n') {
                let line = buffer[..idx].trim().to_string();
                buffer.drain(..idx + 1);

                if line.is_empty() { continue; }
                
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(msg) = parsed.get("message") {
                        if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
                            full_text.push_str(content);
                            let _ = app.emit(event_name, serde_json::json!({ "chunk": content, "references": refs }));
                        }
                    }
                }
            }
        }

        Ok(GenerationResponse {
            text: full_text.trim().to_string(),
            references: refs,
        })
    }

    fn context_window(&self) -> usize {
        8_192
    }
}

pub struct OpenAiCompatibleProvider {
    pub name: String,
}

#[async_trait]
impl AiProvider for OpenAiCompatibleProvider {
    async fn generate_stream(&self, app: &AppHandle, request: GenerationRequest, event_name: &str) -> AppResult<GenerationResponse> {
        let pool = &app.state::<crate::database::DbState>().pool;
        let key = crate::services::universal_ai::UniversalAiService::get_provider_token(&self.name, pool).await?;
        if key.is_empty() {
            return Err(AppError::Internal(format!("No API key for {}", self.name)));
        }

        let raw_provider = self.name.strip_prefix("bacham.").unwrap_or(&self.name);
        
        let (mut url, default_model) = match raw_provider {
            "openai" => ("https://api.openai.com/v1/chat/completions".to_string(), "gpt-4o"),
            "openrouter" => ("https://openrouter.ai/api/v1/chat/completions".to_string(), "anthropic/claude-3-haiku"),
            "lmstudio" => ("http://localhost:1234/v1/chat/completions".to_string(), "local-model"),
            "grok" => ("https://api.x.ai/v1/chat/completions".to_string(), "grok-beta"),
            _ => ("https://api.openai.com/v1/chat/completions".to_string(), "gpt-4o"),
        };

        if raw_provider == "lmstudio" && key.starts_with("http") {
            url = format!("{}/v1/chat/completions", key.trim_end_matches('/'));
        }

        let model = sqlx::query("SELECT default_model FROM ai_provider_configs WHERE provider = ?")
            .bind(raw_provider)
            .fetch_optional(pool)
            .await.ok().flatten().and_then(|r| sqlx::Row::try_get::<String, _>(&r, "default_model").ok())
            .unwrap_or_else(|| default_model.to_string());

        let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| reqwest::Client::new());
        
        let mut messages = Vec::new();
        if !request.system_instruction.is_empty() {
            messages.push(serde_json::json!({
                "role": "system",
                "content": request.system_instruction
            }));
        }
        
        for msg in &request.history {
            messages.push(serde_json::json!({
                "role": msg.role,
                "content": msg.content
            }));
        }
        
        if request.history.last().map(|m| m.role.as_str()) != Some("user") || 
           request.history.last().map(|m| m.content.as_str()) != Some(&request.prompt) {
            messages.push(serde_json::json!({
                "role": "user",
                "content": request.prompt
            }));
        }

        let payload = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true
        });

        let mut req = client.post(&url).json(&payload).header("Content-Type", "application/json");

        if raw_provider != "lmstudio" {
            req = req.header("Authorization", format!("Bearer {}", key));
            
            if raw_provider == "openrouter" {
                req = req.header("HTTP-Referer", "https://bacham.com");
                req = req.header("X-Title", "Bacham Copilot");
            }
        }

        let res = req.send().await.map_err(|e| AppError::Internal(e.to_string()))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("API Error {status}: {body}")));
        }

        use futures::stream::StreamExt;
        
        let mut full_text = String::new();
        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let refs = Vec::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| AppError::Internal(e.to_string()))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(idx) = buffer.find('\n') {
                let line = buffer[..idx].trim().to_string();
                buffer.drain(..idx + 1);

                if line.starts_with("data: ") {
                    let data = &line["data: ".len()..];
                    if data == "[DONE]" { continue; }
                    
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(choices) = parsed.get("choices") {
                            if let Some(choice) = choices.get(0) {
                                if let Some(delta) = choice.get("delta") {
                                    if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                        full_text.push_str(content);
                                        let _ = app.emit(event_name, serde_json::json!({ "chunk": content, "references": refs }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(GenerationResponse {
            text: full_text.trim().to_string(),
            references: refs,
        })
    }

    fn context_window(&self) -> usize {
        if self.name == "openrouter" {
            200_000 // Claude 3 context
        } else {
            128_000 // GPT-4o context
        }
    }
}

