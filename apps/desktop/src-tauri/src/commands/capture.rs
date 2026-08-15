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
                        |err| eprintln!("loopback err: {}", err),
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
                        |err| eprintln!("loopback err: {}", err),
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
                        |err| eprintln!("loopback err: {}", err),
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
    
    let mut loopback_guard = state.loopback_stream.lock().unwrap();
    if let Some(stream) = loopback_guard.take() {
        drop(stream);
    }

    let mut mic_guard = state.mic_stream.lock().unwrap();
    if let Some(stream) = mic_guard.take() {
        drop(stream);
    }

    let mut writer_guard = state.writer_thread.lock().unwrap();
    if let Some(handle) = writer_guard.take() {
        let _ = handle.join();
    }

    Ok(true)
}
