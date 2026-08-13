use tauri::{AppHandle, Manager};
use crate::error::{AppResult, AppError};
use std::sync::Mutex;
use std::thread;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, SupportedStreamConfig};
use hound::{WavSpec, WavWriter};
use std::sync::mpsc;
use std::path::PathBuf;

pub struct CaptureState {
    // We hold the stream in an Option. When it's None, it drops and stops recording.
    pub loopback_stream: Mutex<Option<cpal::Stream>>,
    pub writer_thread: Mutex<Option<thread::JoinHandle<()>>>,
}

impl Default for CaptureState {
    fn default() -> Self {
        Self {
            loopback_stream: Mutex::new(None),
            writer_thread: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_native_recording(app: AppHandle, output_path: Option<String>) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    let mut stream_guard = state.loopback_stream.lock().unwrap();

    if stream_guard.is_some() {
        return Ok(true); // Already recording
    }

    // Determine output file path
    let cache_dir = app.path().app_cache_dir().unwrap_or_else(|_| PathBuf::from("cache"));
    std::fs::create_dir_all(&cache_dir).ok();
    let final_path = output_path.unwrap_or_else(|| {
        let mut p = cache_dir.clone();
        p.push("live_meeting_capture.wav");
        p.to_string_lossy().to_string()
    });

    // Setup cpal
    let host = cpal::default_host();
    let device = host.default_output_device().ok_or_else(|| {
        AppError::Internal("No default audio output device found".to_string())
    })?;

    let config: SupportedStreamConfig = device.default_output_config().map_err(|e| {
        AppError::Internal(format!("Failed to get default output config: {}", e))
    })?;

    let sample_rate = config.sample_rate();
    let channels = config.channels();

    // Setup hound WAV writer
    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let (tx, rx) = mpsc::channel::<Vec<f32>>();

    // Spawn writer thread
    let writer_handle = thread::spawn(move || {
        let mut writer = WavWriter::create(&final_path, spec).unwrap();
        while let Ok(data) = rx.recv() {
            for sample in data {
                let _ = writer.write_sample(sample);
            }
        }
        let _ = writer.finalize();
    });

    let err_fn = |err| eprintln!("an error occurred on the audio stream: {}", err);

    let stream = match config.sample_format() {
        SampleFormat::F32 => {
            device.build_input_stream(
                config.clone().into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    let _ = tx.send(data.to_vec());
                },
                err_fn,
                None,
            )
        },
        _ => {
            return Err(AppError::Internal("Unsupported sample format".to_string()));
        }
    }.map_err(|e| AppError::Internal(format!("Failed to build input stream: {}", e)))?;

    stream.play().map_err(|e| AppError::Internal(format!("Failed to play stream: {}", e)))?;

    *stream_guard = Some(stream);
    
    let mut writer_guard = state.writer_thread.lock().unwrap();
    *writer_guard = Some(writer_handle);

    Ok(true)
}

#[tauri::command]
pub async fn stop_native_recording(app: AppHandle) -> AppResult<bool> {
    let state = app.state::<CaptureState>();
    
    let mut stream_guard = state.loopback_stream.lock().unwrap();
    if let Some(stream) = stream_guard.take() {
        drop(stream); // Stops the capture by dropping the stream
    }

    let mut writer_guard = state.writer_thread.lock().unwrap();
    if let Some(handle) = writer_guard.take() {
        // The mpsc channel rx will close since tx (in the stream closure) was dropped, 
        // causing the thread to exit.
        let _ = handle.join();
    }

    Ok(true)
}
