use async_trait::async_trait;
use tauri::{AppHandle, Manager, Emitter};
use crate::error::{AppError, AppResult};
use crate::services::gemini_service::{ChatMessage, ChatReference};
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
        let provider_name = ProviderService::get_active_provider(&pool).await?;

        match provider_name.as_str() {
            "gemini" => Ok(Box::new(GeminiProvider)),
            "openai" | "openrouter" => Ok(Box::new(OpenAiCompatibleProvider { name: provider_name })),
            _ => Ok(Box::new(GeminiProvider)), // Fallback
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
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse&key={}", key);
        
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

pub struct OpenAiCompatibleProvider {
    pub name: String,
}

#[async_trait]
impl AiProvider for OpenAiCompatibleProvider {
    async fn generate_stream(&self, _app: &AppHandle, _request: GenerationRequest, _event_name: &str) -> AppResult<GenerationResponse> {
        // Stub implementation for Phase 7
        // In a real implementation, this would use reqwest to call the OpenAI chat/completions endpoint,
        // iterate over SSE events, and emit `event_name` to the Tauri frontend.
        let pool = &_app.state::<crate::database::DbState>().pool;
        let key = ProviderService::get_api_key(pool, &self.name).await?;
        if key.is_empty() {
            return Err(AppError::Internal(format!("No API key for {}", self.name)));
        }

        Ok(GenerationResponse {
            text: "This is a stub response from an OpenAI-compatible provider.".to_string(),
            references: vec![],
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
