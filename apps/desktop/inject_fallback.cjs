const fs = require('fs');

const fallbackLogic = `
        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("GEMINI TEXT API ERROR {status}: {body}");
            
            // DYNAMIC FALLBACK
            if status.as_u16() == 404 && body.contains("not found") {
                let list_url = format!("https://generativelanguage.googleapis.com/v1/models?key={}", key);
                if let Ok(list_res) = client.get(&list_url).send().await {
                    if let Ok(list_body) = list_res.json::<serde_json::Value>().await {
                        if let Some(models) = list_body.get("models").and_then(|m| m.as_array()) {
                            for m in models {
                                if let Some(methods) = m.get("supportedGenerationMethods").and_then(|m| m.as_array()) {
                                    if methods.iter().any(|method| method.as_str() == Some("generateContent")) {
                                        if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                                            // Retry with new model
                                            let new_model = name.strip_prefix("models/").unwrap_or(name);
                                            let new_url = format!("https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}", new_model, key);
                                            
                                            if let Ok(rr) = client.post(&new_url).json(&payload).send().await {
                                                if rr.status().is_success() {
                                                    if let Ok(retry_body) = rr.json::<serde_json::Value>().await {
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
`;

const file = 'src-tauri/src/services/gemini_service.rs';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("GEMINI TEXT API ERROR {status}: {body}");
            return Err(AppError::Internal(format!("API Error {status}: {body}")));
        }`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, fallbackLogic.trim());
    fs.writeFileSync(file, content);
    console.log('Injected fallback');
} else {
    console.log('Target string not found');
}
