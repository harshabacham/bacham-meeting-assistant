use tauri::{AppHandle, Manager, Emitter};
use uuid::Uuid;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;
use crate::ai::context_engine::{ChatScope, ContextEngine};
use crate::ai::providers::GenerationRequest;
use crate::services::gemini_service::ChatMessage;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub scope_type: String,
    pub scope_ref_json: String,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub provider: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationFilter {
    pub is_pinned: Option<bool>,
    pub is_favorite: Option<bool>,
    pub is_archived: Option<bool>,
    pub scope_type: Option<String>,
}

#[tauri::command]
pub async fn create_conversation(
    app: AppHandle,
    scope: ChatScope,
    title: Option<String>
) -> Result<Conversation, String> {
    let pool = &app.state::<DbState>().pool;
    let id = Uuid::new_v4().to_string();
    
    let scope_type = match &scope {
        ChatScope::Lecture(_) => "lecture",
        ChatScope::MultiLecture(_) => "multi_lecture",
        ChatScope::Folder(_) => "folder",
        ChatScope::Subject(_) => "subject",
        ChatScope::Semester(_) => "semester",
        ChatScope::Library => "library",
    }.to_string();
    
    let scope_ref_json = serde_json::to_string(&scope).unwrap_or_default();
    let title_val = title.unwrap_or_else(|| "New Conversation".to_string());
    let now = Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO conversations (id, title, scope_type, scope_ref_json, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'gemini', 'gemini-2.0-flash-lite', ?, ?)",
        id, title_val, scope_type, scope_ref_json, now, now
    ).execute(pool).await.map_err(|e| e.to_string())?;

    Ok(Conversation {
        id,
        title: title_val,
        scope_type,
        scope_ref_json,
        is_pinned: false,
        is_favorite: false,
        is_archived: false,
        provider: "gemini".to_string(),
        model: "gemini-2.0-flash-lite".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn get_or_create_lecture_conversation(
    app: AppHandle,
    lecture_id: String
) -> Result<Conversation, String> {
    let pool = &app.state::<DbState>().pool;
    let scope = ChatScope::Lecture(lecture_id.clone());
    let scope_ref_json = serde_json::to_string(&scope).unwrap_or_default();
    
    let existing = sqlx::query!(
        "SELECT id, title, scope_type, scope_ref_json, is_pinned, is_favorite, is_archived, provider, model, created_at, updated_at
         FROM conversations 
         WHERE scope_type = 'lecture' AND scope_ref_json = ? 
         ORDER BY created_at DESC LIMIT 1",
        scope_ref_json
    ).fetch_optional(pool).await.map_err(|e| e.to_string())?;

    if let Some(row) = existing {
        return Ok(Conversation {
            id: row.id.unwrap_or_default(),
            title: row.title,
            scope_type: row.scope_type,
            scope_ref_json: row.scope_ref_json,
            is_pinned: row.is_pinned > 0,
            is_favorite: row.is_favorite > 0,
            is_archived: row.is_archived > 0,
            provider: row.provider,
            model: row.model,
            created_at: row.created_at,
            updated_at: row.updated_at,
        });
    }

    // Otherwise create one
    let id = Uuid::new_v4().to_string();
    let title_val = "Lecture Chat".to_string();
    let scope_type = "lecture".to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO conversations (id, title, scope_type, scope_ref_json, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'gemini', 'gemini-2.0-flash-lite', ?, ?)",
        id, title_val, scope_type, scope_ref_json, now, now
    ).execute(pool).await.map_err(|e| e.to_string())?;

    Ok(Conversation {
        id,
        title: title_val,
        scope_type,
        scope_ref_json,
        is_pinned: false,
        is_favorite: false,
        is_archived: false,
        provider: "gemini".to_string(),
        model: "gemini-2.0-flash-lite".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    conversation_id: String,
    content: String
) -> Result<(), String> {
    let pool = &app.state::<DbState>().pool.clone();
    
    let conv_row = sqlx::query!(
        "SELECT scope_ref_json FROM conversations WHERE id = ?",
        conversation_id
    ).fetch_one(pool).await.map_err(|e| e.to_string())?;
    
    let scope: ChatScope = serde_json::from_str(&conv_row.scope_ref_json).unwrap_or(ChatScope::Library);
    
    let user_msg_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query!(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)",
        user_msg_id, conversation_id, content, now
    ).execute(pool).await.map_err(|e| e.to_string())?;
    
    let bundle = ContextEngine::build_context_bundle(pool, &scope, &content).await.map_err(|e| e.to_string())?;
    
    let bundle_id = Uuid::new_v4().to_string();
    let mut s_hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(&serde_json::to_string(&scope).unwrap_or_default(), &mut s_hasher);
    let scope_hash = std::hash::Hasher::finish(&s_hasher).to_string();
    
    let mut q_hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(&content, &mut q_hasher);
    let query_hash = std::hash::Hasher::finish(&q_hasher).to_string();
    
    let lecture_ids_json = serde_json::to_string(&bundle.lecture_ids).unwrap_or_default();
    let truncated = if bundle.truncated { 1 } else { 0 };
    let expires = Utc::now().to_rfc3339();
    
    sqlx::query!(
        "INSERT INTO context_bundles (id, scope_hash, query_hash, assembled_context, truncated, lecture_ids_json, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        bundle_id, scope_hash, query_hash, bundle.assembled_context, truncated, lecture_ids_json, now, expires
    ).execute(pool).await.map_err(|e| e.to_string())?;
    
    let history_rows = sqlx::query!(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        conversation_id
    ).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut history = Vec::new();
    for r in history_rows {
        history.push(ChatMessage {
            role: r.role,
            content: r.content,
        });
    }
    
    let provider = crate::ai::providers::ProviderEngine::get_provider(&app).await.map_err(|e| e.to_string())?;
    let request = GenerationRequest {
        system_instruction: format!("You are an expert AI Tutor designed to help students master material. Your goal is not just to give answers, but to foster deep understanding. Ground your responses strictly in this context:\n{}", bundle.assembled_context),
        history,
        prompt: content.clone(),
    };
    
    let res = provider.generate_stream(&app, request, "ai_chat_chunk").await.map_err(|e| e.to_string())?;
    
    let asst_msg_id = Uuid::new_v4().to_string();
    let asst_now = Utc::now().to_rfc3339();
    sqlx::query!(
        "INSERT INTO messages (id, conversation_id, role, content, context_bundle_id, created_at) VALUES (?, ?, 'assistant', ?, ?, ?)",
        asst_msg_id, conversation_id, res.text, bundle_id, asst_now
    ).execute(pool).await.map_err(|e| e.to_string())?;

    // Generate heuristics for follow-up
    let lower_text = res.text.to_lowercase();
    let mut follow_ups = Vec::new();
    
    if lower_text.contains("```") || lower_text.contains("code") {
        follow_ups.push("Can you explain how this code works in more detail?");
    }
    if lower_text.contains("equation") || lower_text.contains("formula") || lower_text.contains("math") {
        follow_ups.push("Can you walk me through an example using this formula?");
    }
    if lower_text.contains("summary") || lower_text.contains("overall") {
        follow_ups.push("What are the key takeaways I should memorize?");
    }
    if follow_ups.is_empty() {
        follow_ups.push("Can you elaborate on that?");
        follow_ups.push("How does this relate to the broader topic?");
        follow_ups.push("Can you give me a real-world example?");
    }
    
    // Emit follow-ups
    let _ = app.emit("ai_chat_followups", serde_json::json!({
        "messageId": asst_msg_id,
        "suggestions": follow_ups.into_iter().take(3).collect::<Vec<_>>()
    }));
    
    for (i, reference) in res.references.into_iter().enumerate() {
        let ref_id = Uuid::new_v4().to_string();
        let sort_order = i as i64;
        let lecture_id = bundle.lecture_ids.first().cloned().unwrap_or_default();
        
        if !lecture_id.is_empty() {
             let _ = sqlx::query!(
                "INSERT INTO message_references (id, message_id, lecture_id, ref_type, excerpt, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                ref_id, asst_msg_id, lecture_id, reference.ref_type, reference.value, sort_order
            ).execute(pool).await;
        }
    }
    
    sqlx::query!(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        asst_now, conversation_id
    ).execute(pool).await.map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn list_conversations(
    app: AppHandle,
    filter: ConversationFilter
) -> Result<Vec<Conversation>, String> {
    let pool = &app.state::<DbState>().pool;
    
    let mut sql = String::from("SELECT * FROM conversations WHERE 1=1");
    if let Some(p) = filter.is_pinned {
        sql.push_str(&format!(" AND is_pinned = {}", if p { 1 } else { 0 }));
    }
    if let Some(f) = filter.is_favorite {
        sql.push_str(&format!(" AND is_favorite = {}", if f { 1 } else { 0 }));
    }
    if let Some(a) = filter.is_archived {
        sql.push_str(&format!(" AND is_archived = {}", if a { 1 } else { 0 }));
    }
    if let Some(s) = filter.scope_type {
        sql.push_str(&format!(" AND scope_type = '{}'", s.replace("'", "''")));
    }
    sql.push_str(" ORDER BY updated_at DESC");
    
    let rows = sqlx::query(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for row in rows {
        use sqlx::Row;
        results.push(Conversation {
            id: row.get("id"),
            title: row.get("title"),
            scope_type: row.get("scope_type"),
            scope_ref_json: row.get("scope_ref_json"),
            is_pinned: row.get::<i64, _>("is_pinned") > 0,
            is_favorite: row.get::<i64, _>("is_favorite") > 0,
            is_archived: row.get::<i64, _>("is_archived") > 0,
            provider: row.get("provider"),
            model: row.get("model"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        });
    }
    
    Ok(results)
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageReference {
    pub id: String,
    pub lecture_id: String,
    pub timestamp_seconds: Option<i64>,
    pub ref_type: String,
    pub excerpt: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageWithRefs {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    pub references: Vec<MessageReference>,
}

#[tauri::command]
pub async fn get_conversation_history(app: AppHandle, conversation_id: String) -> Result<Vec<ChatMessageWithRefs>, String> {
    let pool = &app.state::<DbState>().pool;
    
    let msgs = sqlx::query("SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
        .bind(&conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for m in msgs {
        use sqlx::Row;
        let msg_id: String = m.get("id");
        
        let refs_rows = sqlx::query("SELECT id, lecture_id, timestamp_seconds, ref_type, excerpt FROM message_references WHERE message_id = ? ORDER BY sort_order ASC")
            .bind(&msg_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;
            
        let mut references = Vec::new();
        for r in refs_rows {
            references.push(MessageReference {
                id: r.get("id"),
                lecture_id: r.get("lecture_id"),
                timestamp_seconds: r.get("timestamp_seconds"),
                ref_type: r.get("ref_type"),
                excerpt: r.get("excerpt"),
            });
        }
        
        results.push(ChatMessageWithRefs {
            id: msg_id,
            role: m.get("role"),
            content: m.get("content"),
            created_at: m.get("created_at"),
            references,
        });
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn rename_conversation(app: AppHandle, id: String, title: String) -> AppResult<()> {
    let pool = &app.state::<DbState>().pool;
    sqlx::query!("UPDATE conversations SET title = ? WHERE id = ?", title, id)
        .execute(pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_conversation_favorite(app: AppHandle, id: String) -> AppResult<()> {
    let pool = &app.state::<DbState>().pool;
    sqlx::query!("UPDATE conversations SET is_favorite = NOT is_favorite WHERE id = ?", id)
        .execute(pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn archive_conversation(app: AppHandle, id: String) -> AppResult<()> {
    let pool = &app.state::<DbState>().pool;
    sqlx::query!("UPDATE conversations SET is_archived = 1 WHERE id = ?", id)
        .execute(pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_conversation(app: AppHandle, id: String) -> AppResult<()> {
    let pool = &app.state::<DbState>().pool;
    sqlx::query!("DELETE FROM conversations WHERE id = ?", id)
        .execute(pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn change_conversation_scope(app: AppHandle, id: String, scope: ChatScope) -> AppResult<()> {
    let pool = &app.state::<DbState>().pool;
    let scope_type = match &scope {
        ChatScope::Lecture(_) => "lecture",
        ChatScope::MultiLecture(_) => "multi_lecture",
        ChatScope::Folder(_) => "folder",
        ChatScope::Subject(_) => "subject",
        ChatScope::Semester(_) => "semester",
        ChatScope::Library => "library",
    }.to_string();
    let scope_ref_json = serde_json::to_string(&scope).unwrap_or_default();
    
    sqlx::query!(
        "UPDATE conversations SET scope_type = ?, scope_ref_json = ? WHERE id = ?",
        scope_type, scope_ref_json, id
    ).execute(pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    Ok(())
}

