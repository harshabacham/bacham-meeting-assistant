use serde_json::Value;
use crate::error::{AppResult, AppError};
use reqwest::Client;

pub async fn execute_google_drive_action(
    action: &str,
    payload: Value,
    token: &str,
) -> AppResult<Value> {
    match action {
        "export" => {
            let token = token.trim();
            if token.is_empty() {
                return Err(AppError::Internal("Google Drive token is missing.".to_string()));
            }

            let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Meeting_Notes");
            let safe_title = title.replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_");
            let content = payload.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let summary = payload.get("summary").and_then(|v| v.as_str()).unwrap_or("");

            let file_content = if !content.trim().is_empty() {
                content.to_string()
            } else if !summary.trim().is_empty() {
                format!("# {}\n\n{}", title, summary)
            } else {
                format!("# {}\n\nNo content provided.", title)
            };

            let boundary = "-------314159265358979323846";
            let delimiter = format!("\r\n--{}\r\n", boundary);
            let close_delimiter = format!("\r\n--{}--\r\n", boundary);

            let metadata = serde_json::json!({
                "name": format!("{}.md", safe_title),
                "mimeType": "text/markdown"
            });

            let metadata_str = serde_json::to_string(&metadata)
                .map_err(|e| AppError::Internal(format!("Failed to serialize metadata: {}", e)))?;

            let mut body = Vec::new();
            body.extend_from_slice(delimiter.as_bytes());
            body.extend_from_slice(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
            body.extend_from_slice(metadata_str.as_bytes());

            body.extend_from_slice(delimiter.as_bytes());
            body.extend_from_slice(b"Content-Type: text/markdown; charset=UTF-8\r\n\r\n");
            body.extend_from_slice(file_content.as_bytes());

            body.extend_from_slice(close_delimiter.as_bytes());

            let client = Client::new();
            let res = client.post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
                .header("Authorization", format!("Bearer {}", token))
                .header("Content-Type", format!("multipart/related; boundary={}", boundary))
                .body(body)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to connect to Google Drive API: {}", e)))?;

            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Google Drive API Error [{}]: {}", status, err_text)));
            }

            let drive_res: Value = res.json().await.unwrap_or_default();
            let file_id = drive_res.get("id").and_then(|v| v.as_str()).unwrap_or("");

            Ok(serde_json::json!({
                "status": "success",
                "message": format!("Uploaded \"{}.md\" to Google Drive successfully!", safe_title),
                "fileId": file_id
            }))
        },
        _ => Err(AppError::Internal(format!("Unsupported action for Google Drive: {}", action)))
    }
}
