use serde_json::Value;
use crate::error::{AppResult, AppError};
use reqwest::Client;

pub async fn execute_slack_action(
    action: &str,
    payload: Value,
    token: &str,
) -> AppResult<Value> {
    match action {
        "export" => {
            let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Meeting");
            let summary = payload.get("summary").and_then(|v| v.as_str()).unwrap_or("No summary available.");

            let slack_payload = serde_json::json!({
                "text": format!("*Meeting Notes: {}*\n\n{}", title, summary.chars().take(2000).collect::<String>())
            });

            let client = Client::new();
            let res = client.post(token)
                .json(&slack_payload)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to connect to Slack API: {}", e)))?;

            if !res.status().is_success() {
                let status = res.status();
                let text = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Slack API Error [{}]: {}", status, text)));
            }

            Ok(serde_json::json!({
                "status": "success",
                "message": "Sent to Slack channel successfully."
            }))
        },
        _ => Err(AppError::Internal(format!("Unsupported action for Slack: {}", action)))
    }
}
