use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use futures::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc};
use lazy_static::lazy_static;

lazy_static! {
    pub static ref WS_CLIENTS: Arc<Mutex<Vec<mpsc::Sender<String>>>> = Arc::new(Mutex::new(Vec::new()));
}

pub async fn broadcast_to_extension(message: String) {
    let mut clients = WS_CLIENTS.lock().await;
    let mut i = 0;
    while i < clients.len() {
        if clients[i].send(message.clone()).await.is_err() {
            clients.remove(i);
        } else {
            i += 1;
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "CHUNK_READY")]
    ChunkReady {
        payload: ChunkPayload,
    },
    #[serde(rename = "PING")]
    Ping,
    #[serde(rename = "START_AUTO_RECORD")]
    StartAutoRecord,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(non_snake_case)]
pub struct ChunkPayload {
    pub sessionId: String,
    pub chunkIndex: u32,
    pub blobBase64: String,
    pub mimeType: String,
}

#[derive(Clone)]
pub struct WsServerState {
    pub app_handle: AppHandle,
}

pub async fn start_ws_server(app_handle: AppHandle) {
    let addr = "127.0.0.1:1421";
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("WS Server failed to bind to {}: {}", addr, e);
            return;
        }
    };
    println!("WebSocket Server listening on ws://{}", addr);

    let state = WsServerState { app_handle };

    while let Ok((stream, _)) = listener.accept().await {
        let state = state.clone();
        tokio::spawn(handle_connection(stream, state));
    }
}

async fn handle_connection(stream: TcpStream, state: WsServerState) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WS error during handshake: {}", e);
            return;
        }
    };

    println!("Extension connected via WebSocket");
    let (mut write, mut read) = ws_stream.split();

    // Create a channel for this specific client to receive broadcasts
    let (tx, mut rx) = mpsc::channel::<String>(32);
    {
        let mut clients = WS_CLIENTS.lock().await;
        clients.push(tx.clone());
    }

    // Spawn a task to handle outbound messages
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(tokio_tungstenite::tungstenite::Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(msg) = read.next().await {
        match msg {
            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                // 1. First try parsing as full NativeMessage protocol (SESSION_START, CHUNK_READY, SESSION_STOP, HEARTBEAT, etc.)
                if let Ok(native_msg) = serde_json::from_str::<crate::native_messaging::protocol::NativeMessage<serde_json::Value>>(&text) {
                    let tx_clone = tx.clone();
                    let sender: Option<Arc<dyn Fn(crate::native_messaging::protocol::NativeMessage<serde_json::Value>) + Send + Sync>> = Some(Arc::new(move |reply| {
                        if let Ok(json_str) = serde_json::to_string(&reply) {
                            let tx_inner = tx_clone.clone();
                            tokio::spawn(async move {
                                let _ = tx_inner.send(json_str).await;
                            });
                        }
                    }));
                    crate::native_messaging::host::NativeHost::process_message(&state.app_handle, native_msg, sender);
                } else if let Ok(parsed) = serde_json::from_str::<WsMessage>(&text) {
                    // 2. Legacy fallback for raw ping / auto-record
                    match parsed {
                        WsMessage::Ping => {
                            let _ = tx.send("{\"type\":\"PONG\"}".to_string()).await;
                        }
                        WsMessage::StartAutoRecord => {
                            let _ = crate::commands::capture::start_native_recording(state.app_handle.clone(), None).await;
                        }
                        WsMessage::ChunkReady { payload } => {
                            let _ = state.app_handle.emit("live_chunk_received", &payload);
                        }
                    }
                }
            }
            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                println!("Extension WebSocket closed");
                break;
            }
            _ => {}
        }
    }
}
