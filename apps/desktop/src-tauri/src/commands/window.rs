use tauri::{AppHandle, Manager};
use crate::error::AppResult;

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn window_maximize(app: AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            window.unmaximize().map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        } else {
            window.maximize().map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn window_close(app: AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    }
    Ok(())
}
