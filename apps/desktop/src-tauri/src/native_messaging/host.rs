use std::io::{self, Read, Write};
use serde_json::Value;
use tauri::{AppHandle, Manager, Emitter};
use std::sync::{Arc, Mutex};
use crate::native_messaging::protocol::{NativeMessage, MessageType, SessionStartPayload, ChunkReadyPayload, SessionStopPayload, DeleteLecturePayload, RenameLecturePayload};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use uuid::Uuid;

pub struct NativeHost {
    app: AppHandle,
    writer: Arc<Mutex<std::io::Stdout>>,
}

impl NativeHost {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            writer: Arc::new(Mutex::new(std::io::stdout())),
        }
    }

    pub fn start(&self) {
        let mut stdin = io::stdin().lock();
        
        loop {
            let mut length_bytes = [0u8; 4];
            if stdin.read_exact(&mut length_bytes).is_err() {
                break;
            }
            
            let msg_len = u32::from_ne_bytes(length_bytes) as usize;
            
            if msg_len > 50 * 1024 * 1024 {
                eprintln!("Message too large, exiting.");
                break;
            }
            
            let mut msg_buf = vec![0u8; msg_len];
            if stdin.read_exact(&mut msg_buf).is_err() {
                break;
            }
            
            let message_str = String::from_utf8_lossy(&msg_buf);
            
            match serde_json::from_str::<NativeMessage<Value>>(&message_str) {
                Ok(msg) => {
                    self.handle_message(msg);
                }
                Err(e) => {
                    eprintln!("Failed to parse native message: {}", e);
                }
            }
        }
    }
    
    pub fn send_message<T: serde::Serialize>(&self, msg: &NativeMessage<T>) -> Result<(), Box<dyn std::error::Error>> {
        let json_str = serde_json::to_string(msg)?;
        let bytes = json_str.as_bytes();
        let len = bytes.len() as u32;
        
        let mut writer = self.writer.lock().unwrap();
        writer.write_all(&len.to_ne_bytes())?;
        writer.write_all(bytes)?;
        writer.flush()?;
        
        Ok(())
    }
    
    pub fn handle_message(&self, msg: NativeMessage<Value>) {
        let writer_clone = self.writer.clone();
        let sender: Option<Arc<dyn Fn(NativeMessage<Value>) + Send + Sync>> = Some(Arc::new(move |reply| {
            if let Ok(json_str) = serde_json::to_string(&reply) {
                let bytes = json_str.as_bytes();
                let len = bytes.len() as u32;
                if let Ok(mut w) = writer_clone.lock() {
                    let _ = w.write_all(&len.to_ne_bytes());
                    let _ = w.write_all(bytes);
                    let _ = w.flush();
                }
            }
        }));
        Self::process_message(&self.app, msg, sender);
    }
    
    pub fn process_message(
        app: &AppHandle,
        msg: NativeMessage<Value>,
        response_sender: Option<Arc<dyn Fn(NativeMessage<Value>) + Send + Sync>>,
    ) {
        if msg.r#type == MessageType::Heartbeat {
            let ack = NativeMessage {
                version: msg.version,
                r#type: MessageType::Ack,
                payload: serde_json::json!({ "status": "ok" }),
                timestamp: chrono::Utc::now().timestamp_millis(),
                session_id: msg.session_id,
            };
            
            // Write heartbeat timestamp for UI to read
            let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
            let _ = std::fs::create_dir_all(&temp_dir);
            let heartbeat_path = temp_dir.join("extension_heartbeat.txt");
            let _ = std::fs::write(&heartbeat_path, chrono::Utc::now().timestamp_millis().to_string());
            
            if let Some(ref sender) = response_sender {
                sender(ack);
            }
            return;
        }

        if msg.r#type == MessageType::SessionStart {
            if let Some(session_id) = &msg.session_id {
                if let Ok(payload) = serde_json::from_value::<SessionStartPayload>(msg.payload.clone()) {
                    let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                    std::fs::create_dir_all(&temp_dir).unwrap_or_default();
                    
                    let pool = app.state::<crate::database::DbState>().pool.clone();
                    let session_id_clone = session_id.clone();
                    
                    let title = if let Some(label) = &payload.course_label {
                        if label.trim().is_empty() {
                            payload.tab_title.clone()
                        } else {
                            label.clone()
                        }
                    } else {
                        payload.tab_title.clone()
                    };
                    let course_label = payload.course_label.clone();
                    
                    let app_clone = app.clone();
                    
                    tauri::async_runtime::spawn(async move {
                        // Immediately wake the app so the user sees the transition
                        let _ = app_clone.emit("auto_wake_live", session_id_clone.clone());

                        let now = chrono::Utc::now().to_rfc3339();
                        if let Err(e) = sqlx::query!(
                            "INSERT INTO lectures (id, title, course_label, duration_ms, source, created_at, updated_at) VALUES (?, ?, ?, 0, 'extension', ?, ?)
                             ON CONFLICT(id) DO UPDATE SET updated_at = ?",
                            session_id_clone, title, course_label, now, now, now
                        ).execute(&pool).await {
                            let log_path = temp_dir.parent().unwrap().join("debug.log");
                            if let Ok(mut log_file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
                                let _ = writeln!(log_file, "SessionStart DB Insert Error: {:?}", e);
                            }
                        } else {
                            let _ = app_clone.emit("refresh_lectures", ());
                        }
                    });
                } else {
                    let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                    let log_path = temp_dir.parent().unwrap().join("debug.log");
                    if let Ok(mut log_file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
                        let _ = writeln!(log_file, "Failed to parse SessionStartPayload: {:?}", msg.payload);
                    }
                }
            }
            return;
        }

        if msg.r#type == MessageType::ChunkReady {
            if let Some(session_id) = &msg.session_id {
                if let Ok(payload) = serde_json::from_value::<ChunkReadyPayload>(msg.payload.clone()) {
                    if let Ok(bytes) = STANDARD.decode(&payload.data_base64) {
                        let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                        std::fs::create_dir_all(&temp_dir).unwrap_or_default();
                        
                        let is_transcript = payload.is_transcript_chunk.unwrap_or(false);
                        
                        let log_path = temp_dir.parent().unwrap().join("debug.log");
                        if let Ok(mut log_file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
                            let _ = writeln!(log_file, "Received ChunkReady: is_transcript={}, bytes={}", is_transcript, bytes.len());
                        }
                        
                        if is_transcript {
                            let chunk_path = temp_dir.join(format!("{}_transcript.webm", session_id));
                            if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(&chunk_path) {
                                let _ = file.write_all(&bytes);
                            }
                        } else {
                            let file_path = temp_dir.join(format!("{}.webm", session_id));
                            if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(&file_path) {
                                let _ = file.write_all(&bytes);
                            }
                        }
                    }
                } else {
                    let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                    let log_path = temp_dir.parent().unwrap().join("debug.log");
                    if let Ok(mut log_file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
                        let _ = writeln!(log_file, "Failed to parse ChunkReadyPayload!");
                    }
                }
            }
            return;
        }



        if msg.r#type == MessageType::SessionStop {
            if let Some(session_id) = &msg.session_id {
                if let Ok(payload) = serde_json::from_value::<SessionStopPayload>(msg.payload.clone()) {
                    let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                    let file_path = temp_dir.join(format!("{}.webm", session_id));
                    
                    let pool = app.state::<crate::database::DbState>().pool.clone();
                    let session_id_clone = session_id.clone();
                    let app_clone = app.clone();
                    
                    tauri::async_runtime::spawn(async move {
                        let log_path = temp_dir.parent().unwrap().join("debug.log");
                        let mut log_file = std::fs::OpenOptions::new().create(true).append(true).open(&log_path).unwrap();
                        let _ = writeln!(log_file, "Starting AI Pipeline for session {}", session_id_clone);

                        // 1. Immediately persist video so UI can play it right away
                        let videos_dir = app_clone.path().document_dir().unwrap().join("BACHAM").join("Data").join("videos");
                        let _ = tokio::fs::create_dir_all(&videos_dir).await;
                        let perm_file_path = videos_dir.join(format!("{}.webm", session_id_clone));
                        
                        if let Ok(_) = tokio::fs::copy(&file_path, &perm_file_path).await {
                            let perm_path_str = perm_file_path.to_string_lossy().to_string();
                            let _ = sqlx::query(
                                "UPDATE lectures SET video_path = ? WHERE id = ?"
                            )
                            .bind(perm_path_str)
                            .bind(&session_id_clone)
                            .execute(&pool).await;
                            
                            // Cleanup temp file
                            let _ = tokio::fs::remove_file(&file_path).await;
                        }

                        // Also update lecture duration
                        let duration = payload.duration_ms as i64;
                        let now_update = chrono::Utc::now().to_rfc3339();
                        let _ = sqlx::query!(
                            "UPDATE lectures SET duration_ms = ?, updated_at = ? WHERE id = ?",
                            duration, now_update, session_id_clone
                        ).execute(&pool).await;

                        let _ = app_clone.emit("refresh_lectures", ());

                        let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                            "sessionId": session_id_clone,
                            "status": "uploading",
                            "message": "Uploading video to AI..."
                        }));

                        let chunk_path = temp_dir.join(format!("{}_transcript.webm", session_id_clone));
                        let mut full_transcript = String::new();
                        let mut pipeline_error = false;

                        if chunk_path.exists() {
                            let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                "sessionId": session_id_clone,
                                "status": "transcribing",
                                "message": "Transcribing audio..."
                            }));

                            let processing_path = temp_dir.join(format!("{}_transcript_processing_{}.webm", session_id_clone, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
                            let _ = std::fs::rename(&chunk_path, &processing_path);

                            match crate::services::gemini_service::GeminiService::upload_file(&processing_path, "audio/webm", &app_clone).await {
                                Ok(file_uri) => {
                                    let _ = writeln!(log_file, "Upload successful: {}", file_uri);
                                    match crate::services::gemini_service::GeminiService::transcribe_file(&file_uri, "audio/webm", &app_clone).await {
                                        Ok(mut text) => {
                                            let _ = writeln!(log_file, "Transcription successful, length: {}", text.len());
                                            
                                            // Handle completely silent/empty transcripts so the UI doesn't break
                                            if text.trim().is_empty() {
                                                text = "[No speech detected in this recording]".to_string();
                                            }

                                            let t_id = uuid::Uuid::new_v4().to_string();
                                            let _ = sqlx::query!(
                                                "INSERT INTO transcripts (id, lecture_id, content, model_used) VALUES (?, ?, ?, 'gemini-2.0-flash-lite')",
                                                t_id, session_id_clone, text
                                            ).execute(&pool).await;
                                            full_transcript = text;
                                        }
                                        Err(e) => {
                                            pipeline_error = true;
                                            let _ = writeln!(log_file, "Transcription failed: {:?}", e);
                                            let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                                "sessionId": session_id_clone,
                                                "status": "error",
                                                "message": format!("Transcription failed: {:?}", e)
                                            }));
                                        }
                                    }
                                }
                                Err(e) => {
                                    pipeline_error = true;
                                    let _ = writeln!(log_file, "Upload failed: {:?}", e);
                                    let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                        "sessionId": session_id_clone,
                                        "status": "error",
                                        "message": format!("Upload failed: {:?}", e)
                                    }));
                                }
                            }
                            let _ = tokio::fs::remove_file(&processing_path).await;
                        }
                        
                        if !pipeline_error {
                            if !full_transcript.trim().is_empty() {
                                let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                    "sessionId": session_id_clone,
                                    "status": "summarizing",
                                    "message": "Generating intelligence..."
                                }));

                                let _ = writeln!(log_file, "Triggering intelligence engine...");
                                // Trigger the full intelligence engine (all 13 artifact types)
                                crate::ai::intelligence_engine::IntelligenceEngine::generate_all(
                                    app_clone.clone(),
                                    session_id_clone.clone()
                                ).await;

                                // Populate timeline from key frames
                                let _ = crate::services::timeline_service::TimelineService::populate_from_key_frames(
                                    &pool, &session_id_clone
                                ).await;

                                // Generate and store semantic embeddings for Global Chat
                                let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                    "sessionId": session_id_clone,
                                    "status": "embedding",
                                    "message": "Generating semantic vectors..."
                                }));
                                let _ = crate::ai::intelligence_engine::IntelligenceEngine::generate_embeddings(
                                    app_clone.clone(),
                                    session_id_clone.clone(),
                                    full_transcript.clone()
                                ).await;
                            }
                            
                            // (Video persistence moved to start of pipeline)
                            
                            // 5. Notify UI
                            let _ = app_clone.emit("pipeline_progress", serde_json::json!({
                                "sessionId": session_id_clone,
                                "status": "complete",
                                "message": "Pipeline complete!"
                            }));
                            let _ = app_clone.emit("refresh_lectures", ());

                            // Auto-export to markdown if enabled
                            let _ = crate::commands::markdown_export::sync_meeting_to_markdown_internal(
                                &session_id_clone,
                                &pool
                            ).await;
                            
                            let _ = writeln!(log_file, "Pipeline complete!");
                        } else {
                            let _ = writeln!(log_file, "Pipeline aborted due to error.");
                        }

                    });
                }
            }
            return;
        }
        if msg.r#type == MessageType::MetadataReady {
            if let Some(session_id) = &msg.session_id {
                let session_id = session_id.clone();
                let pool = app.state::<crate::database::DbState>().pool.clone();
                let app_clone = app.clone();
                let payload = msg.payload.clone();

                tauri::async_runtime::spawn(async move {
                    // Save image to disk if present
                    if let Some(image_b64) = payload["imageBase64"].as_str() {
                        if let Ok(bytes) = STANDARD.decode(image_b64) {
                            let screenshots_dir = app_clone.path().document_dir().unwrap()
                                .join("BACHAM").join("Data").join("screenshots").join(&session_id);
                            let _ = std::fs::create_dir_all(&screenshots_dir);
                            let screenshot_id = Uuid::new_v4().to_string();
                            let file_path = screenshots_dir.join(format!("{}.png", screenshot_id));
                            if let Ok(_) = std::fs::write(&file_path, &bytes) {
                                let path_str = file_path.to_string_lossy().to_string();
                                let captured_at = chrono::Utc::now().timestamp_millis();
                                let insert_result = sqlx::query!(
                                    "INSERT OR IGNORE INTO screenshots (id, lecture_id, file_path, captured_at) VALUES (?, ?, ?, ?)",
                                    screenshot_id, session_id, path_str, captured_at
                                ).execute(&pool).await;

                                if insert_result.is_ok() {
                                    // ── FrameSelector: evaluate key-frame candidacy ──
                                    let selected = crate::ai::frame_selector::FrameSelector::evaluate(
                                        &pool,
                                        &screenshot_id,
                                        &file_path,
                                        &session_id,
                                    ).await.unwrap_or(false);

                                    // If selected, enqueue OCR for this key frame
                                    if selected {
                                        let pool2 = pool.clone();
                                        let fp2 = file_path.clone();
                                        let sid2 = session_id.clone();
                                        let scid2 = screenshot_id.clone();
                                        tauri::async_runtime::spawn(async move {
                                            let ocr_result = crate::services::ocr_service::OCRService::process_image(
                                                &pool2, &sid2, &fp2
                                            ).await;
                                            // After OCR, refine the change_reason
                                            if ocr_result.is_ok() {
                                                let ocr_text_row = sqlx::query!(
                                                    "SELECT ocr_text FROM screenshots WHERE id = ?",
                                                    scid2
                                                ).fetch_optional(&pool2).await;
                                                if let Ok(Some(row)) = ocr_text_row {
                                                    if let Some(text) = row.ocr_text {
                                                        let _ = crate::ai::frame_selector::FrameSelector::update_change_reason(
                                                            &pool2, &scid2, &text
                                                        ).await;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                });
            }
            return;
        }

        if msg.r#type == MessageType::DeleteLecture {
            if let Ok(payload) = serde_json::from_value::<DeleteLecturePayload>(msg.payload.clone()) {
                let pool = app.state::<crate::database::DbState>().pool.clone();
                let lecture_id = payload.lecture_id;
                let app_clone = app.clone();
                
                tauri::async_runtime::spawn(async move {
                    let _ = sqlx::query!("DELETE FROM lectures WHERE id = ?", lecture_id)
                        .execute(&pool).await;
                    let _ = app_clone.emit("refresh_lectures", ());
                });
            }
            return;
        }

        if msg.r#type == MessageType::RenameLecture {
            if let Ok(payload) = serde_json::from_value::<RenameLecturePayload>(msg.payload.clone()) {
                let pool = app.state::<crate::database::DbState>().pool.clone();
                let lecture_id = payload.lecture_id;
                let new_title = payload.new_title;
                let app_clone = app.clone();
                
                tauri::async_runtime::spawn(async move {
                    let _ = sqlx::query!("UPDATE lectures SET title = ? WHERE id = ?", new_title, lecture_id)
                        .execute(&pool).await;
                    let _ = app_clone.emit("refresh_lectures", ());
                });
            }
            return;
        }

        if msg.r#type == MessageType::LiveCaption {
            if let Some(session_id) = &msg.session_id {
                if let Ok(payload) = serde_json::from_value::<crate::native_messaging::protocol::LiveCaptionPayload>(msg.payload.clone()) {
                    let temp_dir = app.path().document_dir().unwrap().join("BACHAM").join("Data").join("temp");
                    let log_path = temp_dir.parent().unwrap().join("debug.log");
                    if let Ok(mut log_file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
                        let _ = writeln!(log_file, "Received LiveCaption: {} (Platform: {})", payload.text, payload.platform);
                    }

                    let app_clone = app.clone();
                    let session_id_clone = session_id.clone();
                    let pool = app.state::<crate::database::DbState>().pool.clone();

                    tauri::async_runtime::spawn(async move {
                        // ── Persist live caption text to transcripts table ──────────────────
                        // We accumulate captions into a single "live_captions" transcript row
                        // so the Transcript tab can display content immediately during/after recording.
                        let existing = sqlx::query!(
                            "SELECT id, content FROM transcripts WHERE lecture_id = ? AND model_used = 'live_captions' LIMIT 1",
                            session_id_clone
                        )
                        .fetch_optional(&pool)
                        .await;

                        // Determine the formatted text based on speaker
                        let formatted_text = if let Some(speaker) = &payload.speaker_name {
                            format!("[{}]: {}", speaker, payload.text)
                        } else {
                            format!("[Unknown Speaker]: {}", payload.text)
                        };

                        match existing {
                            Ok(Some(row)) => {
                                // Append new caption text to existing row
                                let new_content = format!("{}\n{}", row.content, formatted_text);
                                let _ = sqlx::query!(
                                    "UPDATE transcripts SET content = ? WHERE id = ?",
                                    new_content,
                                    row.id
                                )
                                .execute(&pool)
                                .await;
                            }
                            Ok(None) => {
                                // Insert first caption as a new transcript row
                                let t_id = Uuid::new_v4().to_string();
                                let _ = sqlx::query!(
                                    "INSERT INTO transcripts (id, lecture_id, content, model_used) VALUES (?, ?, ?, 'live_captions')",
                                    t_id, session_id_clone, formatted_text
                                )
                                .execute(&pool)
                                .await;
                            }
                            Err(_) => {}
                        }

                        // ── Emit live_caption_received for the Wingman overlay ──────────────
                        let _ = app_clone.emit("live_caption_received", serde_json::json!({
                            "sessionId": session_id_clone,
                            "text": payload.text,
                            "timestamp": payload.timestamp,
                            "platform": payload.platform,
                        }));
                        
                        // Broadcast transcript segment to the browser extension
                        let ext_msg = serde_json::json!({
                            "type": "TRANSCRIPT_SEGMENT",
                            "payload": {
                                "text": payload.text,
                                "timestamp": payload.timestamp
                            }
                        });
                        crate::ws_server::broadcast_to_extension(ext_msg.to_string()).await;

                        // ── Emit transcript_update so the Transcript tab updates live ───────
                        let full = sqlx::query!(
                            "SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC",
                            session_id_clone
                        )
                        .fetch_all(&pool)
                        .await
                        .unwrap_or_default();

                        let mut full_text = String::new();
                        for r in &full {
                            full_text.push_str(&r.content);
                            full_text.push_str("\n\n");
                        }

                        let _ = app_clone.emit("transcript_update", serde_json::json!({
                            "lectureId": session_id_clone,
                            "content": full_text
                        }));

                        // Process Interview Insights
                        // Take the last 1500 chars of full_text as recent context
                        let context_start = full_text.chars().count().saturating_sub(1500);
                        let recent_context: String = full_text.chars().skip(context_start).collect();
                        
                        let current_speaker = payload.speaker_name.as_deref().unwrap_or("Unknown");
                        let platform = payload.platform.as_str();

                        if let Ok(Some(insight)) = crate::ai::pipeline_v2::interview_engine::InterviewEngine::process_transcript_segment(&recent_context, current_speaker, platform, &pool).await {
                            let insight_msg = serde_json::json!({
                                "type": "INTERVIEW_INSIGHT",
                                "payload": insight
                            });
                            crate::ws_server::broadcast_to_extension(insight_msg.to_string()).await;
                        }
                    });
                }
            }
            return;
        }

        if msg.r#type == MessageType::ConfirmDecision {
            if let Some(session_id) = &msg.session_id {
                if let Ok(payload) = serde_json::from_value::<crate::native_messaging::protocol::ConfirmDecisionPayload>(msg.payload.clone()) {
                    let pool = app.state::<crate::database::DbState>().pool.clone();
                    let session_id_clone = session_id.clone();
                    let decision_text = payload.decision_text;
                    let app_clone = app.clone();

                    tauri::async_runtime::spawn(async move {
                        let existing = sqlx::query!(
                            "SELECT id, content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'action_items' LIMIT 1",
                            session_id_clone
                        ).fetch_optional(&pool).await.unwrap_or(None);

                        let mut items: Vec<String> = vec![];
                        let mut artifact_id = uuid::Uuid::new_v4().to_string();

                        if let Some(row) = existing.as_ref() {
                            if let Some(id) = &row.id {
                                artifact_id = id.clone();
                            }
                            if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&row.content_json) {
                                items = parsed;
                            }
                        }

                        items.push(format!("[Decision] {}", decision_text));
                        let new_json = serde_json::to_string(&items).unwrap();
                        let now = chrono::Utc::now().timestamp_millis();

                        if existing.is_some() {
                            let _ = sqlx::query!(
                                "UPDATE lecture_artifacts SET content_json = ? WHERE id = ?",
                                new_json, artifact_id
                            ).execute(&pool).await;
                        } else {
                            let _ = sqlx::query!(
                                "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status) 
                                 VALUES (?, ?, 'action_items', ?, ?, 'live_decision', 1, 'done')",
                                artifact_id, session_id_clone, new_json, now
                            ).execute(&pool).await;
                        }
                        
                        let _ = app_clone.emit("refresh_lectures", ());
                    });
                }
            }
            return;
        }

    }
}

pub fn start_listener(app: AppHandle) {
    std::thread::spawn(move || {
        let host = NativeHost::new(app);
        host.start();
        std::process::exit(0);
    });
}
