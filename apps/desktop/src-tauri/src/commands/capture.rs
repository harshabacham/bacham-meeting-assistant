use tauri::{AppHandle, Manager, Emitter};
use crate::error::AppResult;
use std::process::{Command, Child};
use std::sync::Mutex;

// A simple global state to hold the recording process for prototyping.
// In a production app, this would be managed more carefully.
pub struct CaptureState {
    pub process: Mutex<Option<Child>>,
}

impl Default for CaptureState {
    fn default() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_native_recording(app: AppHandle) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    let mut process_guard = state.process.lock().unwrap();

    if process_guard.is_some() {
        return Ok(true); // Already recording
    }

    // In a real implementation, we would bundle ffmpeg and use proper OS-specific flags
    // (e.g. -f gdigrab on Windows, -f avfoundation on Mac).
    // For this prototype, we simulate a background recording process.
    let child = Command::new(if cfg!(target_os = "windows") { "cmd" } else { "sh" })
        .args(if cfg!(target_os = "windows") { &["/C", "timeout 3600"] } else { &["-c", "sleep 3600"] })
        .spawn()
        .map_err(|e| crate::error::AppError::Internal(format!("Failed to start capture: {}", e)))?;

    *process_guard = Some(child);
    
    // Simulate emitting live captions for the prototype Live Workspace
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            // Check if still recording
            if app_handle.state::<CaptureState>().process.lock().unwrap().is_none() {
                break;
            }
            
            let caption = serde_json::json!({
                "sessionId": "native-session",
                "text": "This is a simulated native desktop capture transcript block.",
                "timestamp": chrono::Utc::now().timestamp_millis(),
                "platform": "native"
            });
            let _ = app_handle.emit("live_caption_received", caption);
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn stop_native_recording(app: AppHandle) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    let mut process_guard = state.process.lock().unwrap();

    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    Ok(true)
}
