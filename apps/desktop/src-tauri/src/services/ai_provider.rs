use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

pub trait AiProvider: Send + Sync {
    fn generate_text<'a>(
        &'a self,
        prompt: &'a str,
        system_instruction: &'a str,
        pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>>;

    fn generate_multimodal<'a>(
        &'a self,
        prompt: &'a str,
        system_instruction: &'a str,
        image_parts: &'a [(String, String)],
        pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>>;
}

pub struct GeminiProvider;

impl AiProvider for GeminiProvider {
    fn generate_text<'a>(
        &'a self,
        prompt: &'a str,
        system_instruction: &'a str,
        pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>> {
        Box::pin(async move {
            crate::services::gemini_service::GeminiService::generate_text(prompt, system_instruction, pool).await
        })
    }

    fn generate_multimodal<'a>(
        &'a self,
        prompt: &'a str,
        system_instruction: &'a str,
        image_parts: &'a [(String, String)],
        pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>> {
        Box::pin(async move {
            crate::services::gemini_service::GeminiService::generate_multimodal(prompt, system_instruction, image_parts, pool).await
        })
    }
}

// Ollama stub
pub struct OllamaProvider;
impl AiProvider for OllamaProvider {
    fn generate_text<'a>(
        &'a self,
        _prompt: &'a str,
        _system_instruction: &'a str,
        _pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>> {
        Box::pin(async move {
            Err(AppError::Internal("Ollama is not yet implemented".into()))
        })
    }

    fn generate_multimodal<'a>(
        &'a self,
        _prompt: &'a str,
        _system_instruction: &'a str,
        _image_parts: &'a [(String, String)],
        _pool: &'a SqlitePool,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<String>> + Send + 'a>> {
        Box::pin(async move {
            Err(AppError::Internal("Ollama multimodal is not yet implemented".into()))
        })
    }
}
