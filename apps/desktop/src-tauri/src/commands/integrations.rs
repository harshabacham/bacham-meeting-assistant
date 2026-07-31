use crate::error::{AppResult, AppError};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PushNotionInput {
    pub token: String,
    pub page_id: String,
    pub title: String,
    pub content: String,
}

#[tauri::command]
pub async fn push_task_to_notion(input: PushNotionInput) -> AppResult<bool> {
    if input.token.is_empty() {
        return Err(AppError::Internal("Notion API token is missing".into()));
    }
    
    let client = reqwest::Client::new();
    
    let payload = serde_json::json!({
        "parent": { "page_id": input.page_id },
        "properties": {
            "title": [
                {
                    "text": {
                        "content": input.title
                    }
                }
            ]
        },
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": input.content
                            }
                        }
                    ]
                }
            }
        ]
    });

    if input.token.starts_with("mock") {
        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        return Ok(true);
    }

    let res = client.post("https://api.notion.com/v1/pages")
        .header("Authorization", format!("Bearer {}", input.token))
        .header("Notion-Version", "2022-06-28")
        .json(&payload)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Network error: {}", e)))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Notion API Error: {}", err_text)));
    }

    Ok(true)
}
