use tauri::{AppHandle, Manager, Emitter};
use crate::error::AppResult;
use std::sync::Mutex;
use std::thread;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;

// Lossless mono downmixer
fn downmix_to_mono(input: &[f32], channels: u16) -> Vec<f32> {
    if input.is_empty() || channels == 0 {
        return Vec::new();
    }
    let ch = channels as usize;
    if ch == 1 {
        return input.to_vec();
    }
    let mono_len = input.len() / ch;
    let mut mono = Vec::with_capacity(mono_len);
    for i in 0..mono_len {
        let mut sum = 0.0f32;
        for c in 0..ch {
            sum += input[i * ch + c];
        }
        mono.push(sum / (ch as f32));
    }
    mono
}

pub struct CaptureState {
    pub loopback_stream: Mutex<Option<cpal::Stream>>,
    pub mic_stream: Mutex<Option<cpal::Stream>>,
    pub writer_thread: Mutex<Option<thread::JoinHandle<()>>>,
}

impl Default for CaptureState {
    fn default() -> Self {
        Self {
            loopback_stream: Mutex::new(None),
            mic_stream: Mutex::new(None),
            writer_thread: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_native_recording(app: AppHandle, _output_path: Option<String>) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    let mut loopback_guard = state.loopback_stream.lock().unwrap();
    let mut mic_guard = state.mic_stream.lock().unwrap();

    if loopback_guard.is_some() || mic_guard.is_some() {
        return Ok(true); // Already recording
    }

    let host = cpal::default_host();

    // 1. Output device (System Audio Loopback)
    if let Some(device) = host.default_output_device() {
        if let Ok(config) = device.default_output_config() {
            let app_clone = app.clone();
            let sample_rate = config.sample_rate();
            let channels = config.channels();
            let min_chunk_size = (sample_rate / 4).max(4000) as usize; // ~250ms chunks
            let buffer = std::sync::Arc::new(std::sync::Mutex::new(Vec::<f32>::with_capacity(min_chunk_size * 2)));

            let stream = match config.sample_format() {
                SampleFormat::F32 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let mono = downmix_to_mono(data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_sys", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |_err| {},
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::I16 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            let mono = downmix_to_mono(&f32_data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_sys", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |_err| {},
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::U16 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[u16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                            let mono = downmix_to_mono(&f32_data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_sys", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |_err| {},
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                _ => Err(crate::error::AppError::Internal("StreamConfigNotSupported".to_string())),
            };
            if let Ok(s) = stream {
                if let Ok(_) = s.play() {
                    *loopback_guard = Some(s);
                }
            }
        }
    }

    // 2. Input device (Microphone)
    if let Some(device) = host.default_input_device() {
        if let Ok(config) = device.default_input_config() {
            let app_clone = app.clone();
            let sample_rate = config.sample_rate();
            let channels = config.channels();
            let min_chunk_size = (sample_rate / 4).max(4000) as usize; // ~250ms chunks
            let buffer = std::sync::Arc::new(std::sync::Mutex::new(Vec::<f32>::with_capacity(min_chunk_size * 2)));

            let stream = match config.sample_format() {
                SampleFormat::F32 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let mono = downmix_to_mono(data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_mic", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |err| eprintln!("mic err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::I16 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            let mono = downmix_to_mono(&f32_data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_mic", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |err| eprintln!("mic err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::U16 => {
                    let buf_clone = buffer.clone();
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[u16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                            let mono = downmix_to_mono(&f32_data, channels);
                            if !mono.is_empty() {
                                let mut b = buf_clone.lock().unwrap();
                                b.extend_from_slice(&mono);
                                if b.len() >= min_chunk_size {
                                    let chunk: Vec<f32> = b.drain(..).collect();
                                    let _ = app_clone.emit("audio_stream_mic", serde_json::json!({
                                        "data": chunk,
                                        "rate": sample_rate
                                    }));
                                }
                            }
                        },
                        |err| eprintln!("mic err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                _ => Err(crate::error::AppError::Internal("StreamConfigNotSupported".to_string())),
            };
            if let Ok(s) = stream {
                if let Ok(_) = s.play() {
                    *mic_guard = Some(s);
                }
            }
        }
    }

    Ok(true)
}

#[tauri::command]
pub async fn stop_native_recording(app: AppHandle) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    
    let loopback = state.loopback_stream.lock().unwrap().take();
    let mic = state.mic_stream.lock().unwrap().take();
    let writer = state.writer_thread.lock().unwrap().take();

    std::thread::spawn(move || {
        drop(loopback);
        drop(mic);
        if let Some(handle) = writer {
            let _ = handle.join();
        }
    });

    crate::ws_server::broadcast_to_extension("{\"type\":\"STOP_RECORDING\"}".to_string()).await;

    Ok(true)
}

use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::io::Write;
use std::fs::OpenOptions;
use crate::storage::initialize_layout;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveChunkInput {
    pub lecture_id: String,
    pub chunk_base64: String,
}

#[tauri::command]
pub async fn save_video_chunk(app: AppHandle, input: SaveChunkInput) -> AppResult<bool> {
    let layout = initialize_layout(app.path().document_dir().unwrap().join("BACHAM"))?;
    
    // Create videos dir if it doesn't exist
    let videos_dir = layout.data.join("videos");
    std::fs::create_dir_all(&videos_dir).unwrap_or_default();
    
    let file_path = videos_dir.join(format!("{}.webm", input.lecture_id));
    
    // Remove data URI prefix if present (e.g., "data:video/webm;base64,")
    let b64_data = if let Some(idx) = input.chunk_base64.find(',') {
        &input.chunk_base64[idx + 1..]
    } else {
        &input.chunk_base64
    };
    
    let bytes = STANDARD.decode(b64_data).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    let mut file = OpenOptions::new().create(true).append(true).open(&file_path)
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        
    file.write_all(&bytes).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    Ok(true)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveKeyframeInput {
    pub lecture_id: String,
    pub timestamp_ms: u64,
    pub image_base64: String,
}

#[tauri::command]
pub async fn save_keyframe(app: AppHandle, input: SaveKeyframeInput, state: tauri::State<'_, crate::database::DbState>) -> AppResult<String> {
    let layout = initialize_layout(app.path().document_dir().unwrap().join("BACHAM"))?;
    
    let keyframes_dir = layout.data.join("keyframes");
    std::fs::create_dir_all(&keyframes_dir).unwrap_or_default();
    
    let file_name = format!("{}_{}.jpg", input.lecture_id, input.timestamp_ms);
    let file_path = keyframes_dir.join(&file_name);
    
    let b64_data = if let Some(idx) = input.image_base64.find(',') {
        &input.image_base64[idx + 1..]
    } else {
        &input.image_base64
    };
    
    let bytes = STANDARD.decode(b64_data).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    std::fs::write(&file_path, bytes).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    // Convert absolute path to relative path for DB
    let rel_path = format!("keyframes/{}", file_name);
    let screenshot_id = uuid::Uuid::new_v4().to_string();
    let timestamp = input.timestamp_ms as i64;
    
    sqlx::query!(
        "INSERT INTO screenshots (id, lecture_id, file_path, captured_at, is_key_frame)
         VALUES (?, ?, ?, ?, ?)",
        screenshot_id,
        input.lecture_id,
        rel_path,
        timestamp,
        true
    )
    .execute(&state.pool)
    .await?;
    
    // Return relative path or file name
    Ok(rel_path)
}

#[tauri::command]
pub async fn trigger_extension_recording(app: tauri::AppHandle) -> AppResult<()> {
    let sent = crate::ws_server::broadcast_to_extension("{\"type\":\"OPEN_RECORD_POPUP\"}".to_string()).await;
    if !sent {
        // Fallback: If extension service worker is asleep (WS disconnected), 
        // force open the popup page via the OS default browser.
        let url = "chrome-extension://kfngjfenfpaladmjnogmihilchiednfl/src/popup/index.html";
        use tauri_plugin_opener::OpenerExt;
        if let Err(e) = app.opener().open_url(url, None::<&str>) {
            eprintln!("Failed to open extension popup URL fallback: {}", e);
            return Err(crate::error::AppError::Internal("Extension is asleep and we could not wake it. Please click the BACHAM extension icon in your browser to record.".to_string()));
        }
    }
    Ok(())
}

