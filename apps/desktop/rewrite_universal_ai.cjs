const fs = require('fs');
const path = './src-tauri/src/services/universal_ai.rs';
let content = fs.readFileSync(path, 'utf8');

const newGenerateText = `    pub async fn generate_text(
        prompt: &str,
        system_instruction: &str,
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;
        Self::call_provider_text(&preferred, prompt, system_instruction, pool).await
    }

    pub async fn generate_multimodal(
        prompt: &str,
        system_instruction: &str,
        image_parts: &[(String, String)],
        pool: &sqlx::SqlitePool,
    ) -> AppResult<String> {
        let preferred = Self::get_active_provider(pool).await;
        Self::call_provider_multimodal(&preferred, prompt, system_instruction, image_parts, pool).await
    }`;

// Use regex to replace the old generate_text and generate_multimodal blocks
content = content.replace(/    pub async fn generate_text\([\s\S]*?    pub async fn generate_multimodal\([\s\S]*?All AI providers failed or are unavailable"\.to_string\(\)\)\)\n    }/g, newGenerateText);

const oldOllama = `    async fn call_ollama(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.ollama").await.unwrap_or_else(|_| "http://localhost:11434".to_string());
        let client = Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap();
        
        let payload = serde_json::json!({
            "model": "llama3.1", // Modern fallback
            "system": system,
            "prompt": prompt,
            "stream": false
        });`;

const newOllama = `    async fn call_ollama(prompt: &str, system: &str, _pool: &sqlx::SqlitePool) -> AppResult<String> {
        let url = Self::get_provider_token("bacham.ollama").await.unwrap_or_else(|_| "http://localhost:11434".to_string());
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
        });`;

content = content.replace(oldOllama, newOllama);

fs.writeFileSync(path, content);
console.log('Successfully updated universal_ai.rs');
