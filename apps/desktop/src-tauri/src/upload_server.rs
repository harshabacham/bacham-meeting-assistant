use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{Method, StatusCode},
    routing::post,
    Router,
};
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct ServerState {
    app_handle: AppHandle,
}

#[derive(Deserialize)]
#[allow(non_snake_case)]
struct UploadParams {
    sessionId: String,
    r#type: String, // "video" or "transcript"
}

pub async fn start_upload_server(app_handle: AppHandle) {
    let state = ServerState { app_handle };

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::POST, Method::GET, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/health", axum::routing::get(handle_health))
        .route("/upload", post(handle_upload))
        .layer(cors)
        .with_state(state);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 1422));
    
    // Spawn the server using axum 0.7 style
    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        println!("Upload server listening on {}", addr);
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });
    } else {
        eprintln!("Failed to bind upload server to {}", addr);
    }
}

async fn handle_upload(
    State(state): State<ServerState>,
    Query(params): Query<UploadParams>,
    body: Bytes,
) -> Result<StatusCode, (StatusCode, String)> {
    println!("Received upload for session: {}, type: {}, bytes: {}", params.sessionId, params.r#type, body.len());

    let temp_dir = state
        .app_handle
        .path()
        .document_dir()
        .unwrap()
        .join("BACHAM")
        .join("Data")
        .join("temp");

    if let Err(e) = fs::create_dir_all(&temp_dir).await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create temp directory: {}", e),
        ));
    }

    let filename = if params.r#type == "transcript" {
        format!("{}_transcript.webm", params.sessionId)
    } else {
        format!("{}.webm", params.sessionId)
    };

    let file_path = temp_dir.join(&filename);

    let mut file = match File::create(&file_path).await {
        Ok(f) => f,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create file: {}", e),
            ))
        }
    };

    if let Err(e) = file.write_all(&body).await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write to file: {}", e),
        ));
    }

    if let Err(e) = file.flush().await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to flush file: {}", e),
        ));
    }

    println!("Successfully saved upload to {}", file_path.display());

    Ok(StatusCode::OK)
}

async fn handle_health() -> axum::response::Json<serde_json::Value> {
    axum::response::Json(serde_json::json!({
        "ok": true,
        "app": "bacham",
        "version": "0.1.0"
    }))
}
