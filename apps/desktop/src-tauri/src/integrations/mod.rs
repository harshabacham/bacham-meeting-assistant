pub mod slack;
pub mod google_drive;

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
            // Gmail is zero-auth client-side via native system mailto protocol
            Ok(serde_json::json!({
                "status": "success",
                "message": format!("Handled Gmail action {}", action)
            }))
        },
        "bacham.google-drive" => {
            google_drive::execute_google_drive_action(action, payload, token).await
        },
        _ => Err(crate::error::AppError::Internal(format!("Unsupported integration plugin: {}", plugin_id))),
    }
}
