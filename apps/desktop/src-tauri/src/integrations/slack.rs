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
            let webhook_url = token.trim();
            if !webhook_url.starts_with("https://hooks.slack.com/") && !webhook_url.starts_with("http://") && !webhook_url.starts_with("https://") {
                return Err(AppError::Internal("Invalid Slack Webhook URL. It must start with https://hooks.slack.com/...".to_string()));
            }

            let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Meeting");
            let summary = payload.get("summary").and_then(|v| v.as_str()).unwrap_or("");
            let content = payload.get("content").and_then(|v| v.as_str()).unwrap_or("");

            let body_text = if !summary.trim().is_empty() {
                summary
            } else if !content.trim().is_empty() {
                content
            } else {
                "No notes content provided."
            };

            let truncated_body: String = body_text.chars().take(3000).collect();

            let slack_payload = serde_json::json!({
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": format!("📝 Meeting Notes: {}", title),
                            "emoji": true
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": truncated_body
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": "Generated automatically by *Bacham Meeting Assistant*"
                            }
                        ]
                    }
                ]
            });

            let client = Client::new();
            let res = client.post(webhook_url)
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
