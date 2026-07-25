use crate::error::AppResult;
use crate::native_messaging::protocol::ConnectionStatus;
use tauri::Manager;

#[tauri::command]
pub async fn native_messaging_status(app_handle: tauri::AppHandle) -> AppResult<ConnectionStatus> {
    let temp_dir = app_handle.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
    let heartbeat_path = temp_dir.join("extension_heartbeat.txt");
    
    if let Ok(content) = std::fs::read_to_string(&heartbeat_path) {
        if let Ok(timestamp) = content.trim().parse::<i64>() {
            let now = chrono::Utc::now().timestamp_millis();
            // If heartbeat was within last 10 seconds (10000 ms), consider connected
            if now - timestamp < 10000 {
                return Ok(ConnectionStatus::Connected);
            }
        }
    }
    
    Ok(ConnectionStatus::Disconnected)
}

#[tauri::command]
pub async fn fetch_ical_feed(url: String) -> AppResult<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        
    let content = client.get(&url)
        .header("User-Agent", "BACHAM-Desktop/1.0")
        .send()
        .await
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?
        .text()
        .await
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        
    Ok(content)
}

#[tauri::command]
pub async fn fetch_url_with_auth(url: String, token: Option<String>) -> AppResult<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        
    let mut req = client.get(&url).header("User-Agent", "BACHAM-Desktop/1.0");
    if let Some(t) = token {
        if !t.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
    }
    
    let content = req.send()
        .await
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?
        .text()
        .await
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        
    Ok(content)
}


