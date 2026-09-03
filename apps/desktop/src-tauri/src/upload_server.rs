use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{Method, StatusCode},
    response::Html,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tower_http::cors::CorsLayer;
use reqwest::Client;

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

#[derive(Deserialize)]
struct AuthCallbackParams {
    code: Option<String>,
    error: Option<String>,
}

pub async fn start_upload_server(app_handle: AppHandle) {
    let state = ServerState { app_handle };

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::POST, Method::GET, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/health", get(handle_health))
        .route("/upload", post(handle_upload))
        .route("/auth/callback", get(handle_auth_callback))
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

async fn handle_health() -> &'static str {
    "OK"
}

async fn handle_auth_callback(
    State(state): State<ServerState>,
    Query(params): Query<AuthCallbackParams>,
) -> Html<String> {
    if let Some(error) = params.error {
        return Html(format!(
            "<html><body><h1>Authentication Failed</h1><p>Error: {}</p><p>You can close this tab.</p></body></html>",
            error
        ));
    }

    if let Some(code) = params.code {
        // Exchange code for token here in the backend to bypass CORS
        let client_id = std::env::var("VITE_GOOGLE_CLIENT_ID").unwrap_or_else(|_| "439614603794-tupmghbga6mkho95e7rms1ml8du979bn.apps.googleusercontent.com".to_string());
        let client_secret = std::env::var("VITE_GOOGLE_CLIENT_SECRET").unwrap_or_else(|_| "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".to_string());
        
        let client = Client::new();
        let params = [
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", "http://127.0.0.1:1422/auth/callback"),
        ];

        let res = client.post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await;

        if let Ok(response) = res {
            if let Ok(json) = response.json::<serde_json::Value>().await {
                if let Some(id_token) = json.get("id_token").and_then(|t| t.as_str()) {
                    // Emit the id_token to the frontend
                    if let Err(e) = state.app_handle.emit("oauth_id_token", id_token.to_string()) {
                        eprintln!("Failed to emit oauth_id_token event: {}", e);
                    }
                } else {
                    let err_desc = json.get("error_description").and_then(|e| e.as_str()).unwrap_or("Unknown error");
                    if let Err(e) = state.app_handle.emit("oauth_error", err_desc.to_string()) {
                        eprintln!("Failed to emit oauth_error event: {}", e);
                    }
                }
            }
        } else {
            if let Err(e) = state.app_handle.emit("oauth_error", "Failed to contact Google token endpoint".to_string()) {
                eprintln!("Failed to emit oauth_error event: {}", e);
            }
        }

        return Html(
            "<html><head><style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0d0d0d; color: white; margin: 0; }
            .box { text-align: center; padding: 40px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); }
            h1 { margin-top: 0; color: #BAFF29; }
            p { color: #888; }
            </style></head><body>
            <div class='box'>
                <h1>Authentication Successful!</h1>
                <p>You can securely close this tab and return to the application.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
            </div>
            </body></html>"
            .to_string()
        );
    }

    Html("<html><body><h1>Invalid Request</h1><p>No code provided. You can close this tab.</p></body></html>".to_string())
}
