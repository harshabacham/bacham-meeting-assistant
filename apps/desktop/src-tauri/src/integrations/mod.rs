pub mod slack;

use serde_json::Value;
use crate::error::AppResult;

pub async fn dispatch_action(
    plugin_id: &str,
    action: &str,
    payload: Value,
    token: &str,
) -> AppResult<Value> {
    match plugin_id {
        "bacham.slack" => {
            slack::execute_slack_action(action, payload, token).await
        },
        "bacham.gmail" => {
            // Future extension: hook up an SMTP mailer or Gmail API
            // For now, return a success message from the backend
            Ok(serde_json::json!({
                "status": "success",
                "message": format!("Simulated sending email from backend with action {}", action)
            }))
        },
        "bacham.google-drive" => {
            // Future extension: Hook up to Google Drive SDK
            Ok(serde_json::json!({
                "status": "success",
                "message": format!("Simulated uploading to Google Drive with action {}", action)
            }))
        },
        _ => Err(crate::error::AppError::Internal(format!("Unsupported integration plugin: {}", plugin_id))),
    }
}
