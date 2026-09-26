use axum::{
    body::Bytes,
    extract::{Query, State, Json},
    http::{Method, StatusCode, HeaderMap},
    response::Html,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
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
        .route("/auth/token", post(handle_auth_token_post))
        .layer(cors)
        .with_state(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 1422));
    
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
    headers: HeaderMap,
    Query(params): Query<AuthCallbackParams>,
) -> Html<String> {
    if let Some(error) = params.error {
        let _ = state.app_handle.emit("oauth_error", error.clone());
        return Html(format!(
            "<html><head><style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0d0d0d; color: white; margin: 0; }}
            .box {{ text-align: center; padding: 40px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); }}
            h1 {{ margin-top: 0; color: #FF5E5E; }}
            p {{ color: #888; }}
            </style></head><body>
            <div class='box'>
                <h1>Authentication Cancelled</h1>
                <p>Error: {}</p>
                <p>You can close this tab and return to the application.</p>
            </div>
            <script>setTimeout(() => window.close(), 2500);</script>
            </body></html>",
            error
        ));
    }

    if let Some(code) = params.code {
        // Exchange code for token here in the backend to bypass CORS
        let client_id = option_env!("VITE_GOOGLE_CLIENT_ID")
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                std::env::var("VITE_GOOGLE_CLIENT_ID")
                    .unwrap_or_else(|_| "15417749463-hqib9o5nf3fgpcvu1f9bv0gbm6jt06rf.apps.googleusercontent.com".to_string())
            });
        let client_secret = option_env!("VITE_GOOGLE_CLIENT_SECRET")
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                std::env::var("VITE_GOOGLE_CLIENT_SECRET")
                    .unwrap_or_else(|_| "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".to_string())
            });
        
        let client = Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_else(|_| Client::new());

        let host = headers
            .get("host")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("localhost:1422");
        let redirect_uri = format!("http://{}/auth/callback", host);

        let mut form_params: Vec<(&str, &str)> = vec![
            ("client_id", client_id.as_str()),
            ("code", code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ];

        if !client_secret.is_empty() {
            form_params.push(("client_secret", client_secret.as_str()));
        }

        let res = client.post("https://oauth2.googleapis.com/token")
            .form(&form_params)
            .send()
            .await;

        if let Ok(response) = res {
            if let Ok(json) = response.json::<serde_json::Value>().await {
                let id_token = json.get("id_token").and_then(|t| t.as_str()).unwrap_or("");
                let access_token = json.get("access_token").and_then(|t| t.as_str()).unwrap_or("");
                
                if !id_token.is_empty() || !access_token.is_empty() {
                    let mut payload = serde_json::json!({
                        "id_token": id_token,
                        "access_token": access_token
                    });

                    // Fetch user info from Google to have full profile data
                    if !access_token.is_empty() {
                        if let Ok(info_res) = client.get("https://www.googleapis.com/oauth2/v3/userinfo")
                            .bearer_auth(access_token)
                            .send()
                            .await
                        {
                            if let Ok(info_json) = info_res.json::<serde_json::Value>().await {
                                if let Some(obj) = payload.as_object_mut() {
                                    if let Some(email) = info_json.get("email").and_then(|v| v.as_str()) {
                                        obj.insert("email".to_string(), serde_json::Value::String(email.to_string()));
                                    }
                                    if let Some(name) = info_json.get("name").and_then(|v| v.as_str()) {
                                        obj.insert("name".to_string(), serde_json::Value::String(name.to_string()));
                                    }
                                    if let Some(picture) = info_json.get("picture").and_then(|v| v.as_str()) {
                                        obj.insert("picture".to_string(), serde_json::Value::String(picture.to_string()));
                                    }
                                    if let Some(sub) = info_json.get("sub").and_then(|v| v.as_str()) {
                                        obj.insert("sub".to_string(), serde_json::Value::String(sub.to_string()));
                                    }
                                }
                            }
                        }
                    }

                    // Emit token payload to frontend
                    if let Err(e) = state.app_handle.emit("oauth_id_token", payload.to_string()) {
                        eprintln!("Failed to emit oauth_id_token event: {}", e);
                    }
                    
                    if let Some(w) = state.app_handle.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }

                    return Html(
                        "<html><head><title>BACHAM - Authenticated</title><style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0A0A0A; color: #FFFFFF; margin: 0; }
                        .card { text-align: center; padding: 48px 40px; border-radius: 24px; background: #141414; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-width: 420px; width: 90%; }
                        .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: rgba(186, 255, 41, 0.15); border: 1px solid rgba(186, 255, 41, 0.3); margin-bottom: 20px; }
                        .check { width: 28px; height: 28px; stroke: #BAFF29; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
                        h1 { margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #FFFFFF; }
                        p { color: #A0A0A0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5; }
                        .pill { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.06); font-size: 12px; color: #888; font-family: monospace; }
                        </style></head><body>
                        <div class='card'>
                            <div class='badge'>
                                <svg class='check' viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'></polyline></svg>
                            </div>
                            <h1>Authentication Successful</h1>
                            <p>You're signed in! You can safely close this browser window and return to <strong>BACHAM</strong>.</p>
                            <div class='pill'>Closing automatically...</div>
                        </div>
                        <script>setTimeout(() => { window.close(); }, 2000);</script>
                        </body></html>"
                        .to_string()
                    );
                } else {
                    let err_desc = json.get("error_description")
                        .or_else(|| json.get("error"))
                        .and_then(|e| e.as_str())
                        .unwrap_or("Unknown OAuth error");
                    eprintln!("Google token error response: {}", json);
                    if let Err(e) = state.app_handle.emit("oauth_error", err_desc.to_string()) {
                        eprintln!("Failed to emit oauth_error event: {}", e);
                    }
                    return Html(format!(
                        "<html><head><title>BACHAM - Sign In Error</title><style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0A0A0A; color: white; margin: 0; }}
                        .card {{ text-align: center; padding: 40px; border-radius: 20px; background: #141414; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; }}
                        h1 {{ color: #FF5E5E; margin-top: 0; font-size: 20px; }}
                        p {{ color: #888; font-size: 13px; }}
                        </style></head><body>
                        <div class='card'>
                            <h1>Sign-in Incomplete</h1>
                            <p>{}</p>
                            <p>You can close this tab and try again in BACHAM.</p>
                        </div>
                        </body></html>",
                        err_desc
                    ));
                }
            } else {
                if let Err(e) = state.app_handle.emit("oauth_error", "Failed to parse Google token response".to_string()) {
                    eprintln!("Failed to emit oauth_error event: {}", e);
                }
            }
        } else {
            if let Err(e) = state.app_handle.emit("oauth_error", "Failed to contact Google token endpoint".to_string()) {
                eprintln!("Failed to emit oauth_error event: {}", e);
            }
        }

        return Html(
            "<html><head><title>BACHAM - Error</title><style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0A0A0A; color: white; margin: 0; }
            .card { text-align: center; padding: 40px; border-radius: 20px; background: #141414; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; }
            h1 { color: #FF5E5E; margin-top: 0; font-size: 20px; }
            p { color: #888; font-size: 13px; }
            </style></head><body>
            <div class='card'>
                <h1>Authentication Failed</h1>
                <p>Could not verify tokens with Google. Please check your connection and try again.</p>
            </div>
            </body></html>"
            .to_string()
        );
    }

    let _ = state.app_handle.emit("oauth_error", "No authorization code received".to_string());
    Html("<html><body><h1>Invalid Request</h1><p>No authorization code received. You can close this tab.</p></body></html>".to_string())
}

async fn handle_auth_token_post(
    State(state): State<ServerState>,
    Json(payload): Json<serde_json::Value>,
) -> StatusCode {
    println!("Received auth token from external bridge/source: {}", payload);
    if let Err(e) = state.app_handle.emit("oauth_id_token", payload.to_string()) {
        eprintln!("Failed to emit oauth_id_token from bridge: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    } else {
        if let Some(w) = state.app_handle.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
        StatusCode::OK
    }
}
