use tauri::Emitter;

pub struct NotificationService;

impl NotificationService {
    pub fn notify(app: &tauri::AppHandle, title: &str, body: &str) {
        let _ = app.emit("system_notification", serde_json::json!({ "title": title, "body": body }));
    }
}
