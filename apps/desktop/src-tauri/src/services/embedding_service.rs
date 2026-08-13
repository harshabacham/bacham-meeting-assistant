use crate::error::{AppError, AppResult};
use fastembed::{TextEmbedding, InitOptions, EmbeddingModel};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::json;

pub struct EmbeddingService {
    #[allow(dead_code)]
    local_model: Arc<Mutex<Option<TextEmbedding>>>,
}

impl EmbeddingService {
    pub async fn new() -> AppResult<Self> {
        Ok(Self {
            local_model: Arc::new(Mutex::new(None)),
        })
    }

    #[allow(dead_code)]
    async fn get_local_model(&self) -> AppResult<TextEmbedding> {
        let mut model_lock = self.local_model.lock().await;
        if let Some(_model) = model_lock.as_ref() {
            // Re-using initialization concept
        }
        
        let model = TextEmbedding::try_new(InitOptions::new(EmbeddingModel::AllMiniLML6V2).with_show_download_progress(true))
        .map_err(|e| AppError::Internal(format!("Failed to init fastembed: {}", e)))?;
        
        *model_lock = Some(model);
        
        let model2 = TextEmbedding::try_new(InitOptions::new(EmbeddingModel::AllMiniLML6V2).with_show_download_progress(true)).map_err(|e| AppError::Internal(format!("Failed to init fastembed: {}", e)))?;
        
        Ok(model2)
    }

    pub async fn embed_text(&self, text: &str, use_local: bool, gemini_api_key: Option<&str>) -> AppResult<Vec<f32>> {
        if use_local {
            let mut model = TextEmbedding::try_new(InitOptions::new(EmbeddingModel::AllMiniLML6V2).with_show_download_progress(true))
            .map_err(|e| AppError::Internal(format!("Failed to init fastembed: {}", e)))?;
            
            let embeddings = model.embed(vec![text], None)
                .map_err(|e| AppError::Internal(format!("Failed to embed: {}", e)))?;
            
            Ok(embeddings.into_iter().next().unwrap_or_default())
        } else {
            // Use Gemini API
            let api_key = gemini_api_key.ok_or_else(|| AppError::Internal("Gemini API key missing".into()))?;
            
            // Generate embeddings via Gemini API
            let client = reqwest::Client::new();
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}",
                api_key
            );
            
            let payload = json!({
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{
                        "text": text
                    }]
                }
            });
            
            let res = client.post(&url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
                
            let res_json: serde_json::Value = res.json().await
                .map_err(|e| AppError::Internal(e.to_string()))?;
                
            if let Some(values) = res_json.pointer("/embedding/values").and_then(|v| v.as_array()) {
                let vec_f32: Vec<f32> = values.iter()
                    .filter_map(|v| v.as_f64().map(|f| f as f32))
                    .collect();
                Ok(vec_f32)
            } else {
                Err(AppError::Internal("Failed to parse Gemini embedding".into()))
            }
        }
    }
}
