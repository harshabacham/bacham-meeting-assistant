use tauri::{AppHandle, Manager, Emitter};
use crate::error::AppResult;
use std::sync::Mutex;
use std::thread;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;

// High-quality Anti-Aliased Box Resampler to 16kHz Mono directly in Rust
fn process_samples_to_16k_mono(input: &[f32], channels: u16, in_rate: u32) -> Vec<f32> {
    if input.is_empty() || in_rate == 0 || channels == 0 {
        return Vec::new();
    }
    
    // 1. Downmix to mono
    let ch = channels as usize;
    let mono_len = input.len() / ch;
    if mono_len == 0 {
        return Vec::new();
    }
    let mut mono = Vec::with_capacity(mono_len);
    for i in 0..mono_len {
        let mut sum = 0.0f32;
        for c in 0..ch {
            sum += input[i * ch + c];
        }
        mono.push(sum / (ch as f32));
    }
    
    // 2. Anti-aliasing box resample to 16000 Hz
    let out_rate = 16000f32;
    let in_rate_f = in_rate as f32;
    let diff = (in_rate_f - 16000.0f32).abs();
    if diff < 100.0f32 {
        return mono;
    }
    
    let ratio = in_rate_f / out_rate;
    let out_len = (mono.len() as f32 / ratio).floor() as usize;
    if out_len == 0 {
        return Vec::new();
    }
    let mut out = Vec::with_capacity(out_len);
    
    for i in 0..out_len {
        let start_pos = i as f32 * ratio;
        let end_pos = (i + 1) as f32 * ratio;
        let start_idx = start_pos.floor() as usize;
        let end_idx = (end_pos.ceil() as usize).min(mono.len());
        
        let mut sum = 0.0f32;
        let mut count = 0;
        for j in start_idx..end_idx {
            sum += mono[j];
            count += 1;
        }
        out.push(if count > 0 { sum / (count as f32) } else { mono[start_idx.min(mono.len() - 1)] });
    }
    
    out
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
            let stream = match config.sample_format() {
                SampleFormat::F32 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let processed = process_samples_to_16k_mono(data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_sys", processed);
                            }
                        },
                        |err| eprintln!("loopback err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::I16 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            let processed = process_samples_to_16k_mono(&f32_data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_sys", processed);
                            }
                        },
                        |err| eprintln!("loopback err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::U16 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[u16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                            let processed = process_samples_to_16k_mono(&f32_data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_sys", processed);
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
            let stream = match config.sample_format() {
                SampleFormat::F32 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let processed = process_samples_to_16k_mono(data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_mic", processed);
                            }
                        },
                        |err| eprintln!("mic err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::I16 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            let processed = process_samples_to_16k_mono(&f32_data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_mic", processed);
                            }
                        },
                        |err| eprintln!("mic err: {}", err),
                        None,
                    ).map_err(|e| crate::error::AppError::Internal(e.to_string()))
                },
                SampleFormat::U16 => {
                    device.build_input_stream(
                        config.clone().into(),
                        move |data: &[u16], _: &cpal::InputCallbackInfo| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                            let processed = process_samples_to_16k_mono(&f32_data, channels, sample_rate);
                            if !processed.is_empty() {
                                let _ = app_clone.emit("audio_stream_mic", processed);
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
