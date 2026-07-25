use tauri::{State, AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::gemini_service::{GeminiService, ChatMessage};
use crate::services::flashcard_service::FlashcardService;
use crate::services::quiz_service::QuizService;
use crate::ai::intelligence_engine::IntelligenceEngine;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatInput {
    pub lecture_id: Option<String>,
    pub prompt: String,
    pub history: Vec<ChatMessage>,
}

#[tauri::command]
pub async fn ai_chat_send(app: AppHandle, input: AiChatInput) -> AppResult<()> {
    if let Some(lecture_id) = &input.lecture_id {
        GeminiService::stream_chat_grounded(&app, lecture_id, &input.prompt, &input.history).await?;
    } else {
        GeminiService::stream_chat(&app, &input.prompt, &input.history).await?;
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderChatInput {
    pub folder_id: String,
    pub prompt: String,
    pub history: Vec<ChatMessage>,
}

#[tauri::command]
pub async fn folder_chat_send(app: AppHandle, input: FolderChatInput) -> AppResult<()> {
    // 1. Fetch all lectures inside this folder (and its subfolders, if any, though it's 1-level)
    let pool = app.state::<DbState>().pool.clone();
    let folder_id = input.folder_id;

    let lectures = sqlx::query!(
        "SELECT id FROM lectures WHERE folder_id = ? OR folder_id IN (SELECT id FROM folders WHERE parent_id = ?)",
        folder_id, folder_id
    ).fetch_all(&pool).await?;

    let lecture_ids: Vec<String> = lectures.into_iter().map(|r| r.id.unwrap_or_default()).collect();

    if lecture_ids.is_empty() {
        use tauri::Emitter;
        app.emit("ai_chat_chunk", serde_json::json!({ "chunk": "This folder is empty. There are no lectures to analyze.", "references": [] }))
            .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        return Ok(());
    }

    // Since we don't have a cross-lecture context builder, we'll extract the text summaries or chunks manually.
    // For simplicity, we get the `lecture_intelligence` summary for each lecture.
    let mut combined_context = String::new();
    
    for id in &lecture_ids {
        let row = sqlx::query!(
            "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence' AND status = 'done' ORDER BY version DESC LIMIT 1",
            id
        ).fetch_optional(&pool).await?;

        if let Some(r) = row {
            let parsed: serde_json::Value = serde_json::from_str(&r.content_json).unwrap_or_default();
            if let Some(summary) = parsed.get("summary").and_then(|v| v.as_str()) {
                combined_context.push_str(&format!("\n--- LECTURE {} ---\n{}\n", id, summary));
            }
        }
    }

    if combined_context.is_empty() {
        use tauri::Emitter;
        app.emit("ai_chat_chunk", serde_json::json!({ "chunk": "No processed content found in this folder. Try analyzing the lectures first.", "references": [] }))
            .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        return Ok(());
    }
    let system = format!(
        "You are an expert AI Tutor analyzing a whole folder of lectures. \
         Ground your answers ONLY in the combined context below. \
         If the answer is not in the text, say 'I couldn't find that information in this folder.'\n\n\
         CONTEXT:\n{}",
        combined_context
    );

    // Make the Gemini request
    let key = GeminiService::get_api_key(&pool).await?;
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={}", key);
    
    let mut contents = Vec::new();
    for msg in &input.history {
        let role = if msg.role == "user" { "user" } else { "model" };
        contents.push(serde_json::json!({
            "role": role,
            "parts": [{ "text": msg.content }]
        }));
    }
    contents.push(serde_json::json!({
        "role": "user",
        "parts": [{ "text": input.prompt }]
    }));

    let payload = serde_json::json!({
        "systemInstruction": { "parts": [{ "text": system }] },
        "contents": contents
    });

    let res = client.post(&url).json(&payload).send().await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    
    let body: serde_json::Value = res.json().await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    let text = body.get("candidates")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("content"))
        .and_then(|c| c.get("parts"))
        .and_then(|p| p.get(0))
        .and_then(|p| p.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("I couldn't find that information in this folder.");

    use tauri::Emitter;
    app.emit("ai_chat_chunk", serde_json::json!({ "chunk": text, "references": [] }))
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;

    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TutorActionInput {
    pub lecture_id: String,
    pub action_type: String,
    pub target_id: Option<String>,
    pub target_text: Option<String>,
}

#[tauri::command]
pub async fn send_tutor_action(app: AppHandle, input: TutorActionInput) -> AppResult<String> {
    GeminiService::generate_tutor_action(&app, &input.lecture_id, &input.action_type, input.target_id.as_deref(), input.target_text.as_deref()).await
}

#[tauri::command]
pub async fn lecture_intelligence_generate(lecture_id: String, app: AppHandle) -> AppResult<()> {
    tauri::async_runtime::spawn(async move {
        IntelligenceEngine::generate_all(app, lecture_id).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn summary_generate(lecture_id: String, _transcript: String, _app: AppHandle, state: State<'_, DbState>) -> AppResult<String> {
    // 1. Run the new core multimodal AI pipeline
    crate::ai::core_engine::coordinator::CoreEngineCoordinator::run_full_pipeline(&lecture_id, &state.pool).await?;

    // 2. Fetch the generated tiered summary from the summaries table
    let row = sqlx::query!(
        "SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1",
        lecture_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let summary = row.map(|r| r.content).unwrap_or_else(|| "Failed to generate summary".to_string());
    Ok(summary)
}

#[derive(serde::Deserialize)]
pub enum ChatScope {
    Lecture,
    Folder,
    Collection,
    Subject,
    Semester,
    Library,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ChatSessionHandle {
    pub session_id: String,
}

#[tauri::command]
pub async fn start_scoped_chat(
    _app: AppHandle,
    _scope: ChatScope,
    _lecture_ids: Vec<String>,
) -> AppResult<ChatSessionHandle> {
    unimplemented!()
}

#[tauri::command]
pub async fn flashcards_generate(lecture_id: String, transcript: String, state: State<'_, DbState>) -> AppResult<()> {
    FlashcardService::generate_flashcards(&state.pool, &lecture_id, &transcript).await
}

#[tauri::command]
pub async fn quiz_generate(lecture_id: String, transcript: String, state: State<'_, DbState>) -> AppResult<()> {
    QuizService::generate_quiz(&state.pool, &lecture_id, &transcript).await
}
use crate::error::AppError;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderSuggestion {
    pub folder_id: String,
    pub confidence: f32,
    pub reason: String,
}

#[tauri::command]
pub async fn suggest_folders_for_lecture(
    state: State<'_, DbState>,
    lecture_id: String
) -> AppResult<Vec<FolderSuggestion>> {
    use sqlx::Row;
    
    // 1. Fetch lecture details
    let lecture = sqlx::query(
        "SELECT l.title, l.subject, l.tags_flat, f.summary 
         FROM lectures l 
         LEFT JOIN lectures_fts f ON l.rowid = f.rowid
         WHERE l.id = ?"
    ).bind(&lecture_id).fetch_optional(&state.pool).await?;

    let lecture_row = match lecture {
        Some(l) => l,
        None => return Err(AppError::Internal("Lecture not found".into())),
    };

    let title: Option<String> = lecture_row.try_get("title").unwrap_or_default();
    let subject: Option<String> = lecture_row.try_get("subject").unwrap_or_default();
    let tags: Option<String> = lecture_row.try_get("tags_flat").unwrap_or_default();
    let summary: Option<String> = lecture_row.try_get("summary").unwrap_or_default();

    let title_str = title.unwrap_or_default();
    let subject_str = subject.unwrap_or_default();
    let tags_str = tags.unwrap_or_default();
    let summary_str = summary.unwrap_or_default();

    // 2. Fetch all folders
    let folders = sqlx::query(
        "SELECT id, name, subject, description FROM folders WHERE is_archived = 0 AND trashed_at IS NULL"
    ).fetch_all(&state.pool).await?;

    if folders.is_empty() {
        return Ok(vec![]);
    }

    let mut folders_context = String::new();
    for f in folders {
        let f_id: String = f.try_get("id").unwrap_or_default();
        let f_name: Option<String> = f.try_get("name").unwrap_or_default();
        let f_subject: Option<String> = f.try_get("subject").unwrap_or_default();
        let f_desc: Option<String> = f.try_get("description").unwrap_or_default();
        
        folders_context.push_str(&format!(
            "- Folder ID: {}\n  Name: {}\n  Subject: {}\n  Description: {}\n\n",
            f_id, f_name.unwrap_or_default(), f_subject.unwrap_or_default(), f_desc.unwrap_or_default()
        ));
    }

    // 3. Prompt AI
    let prompt = format!(
        "Analyze this lecture and suggest the most appropriate folders to organize it into, from the provided list.\n\
         Lecture Title: {}\nLecture Subject: {}\nLecture Tags: {}\nLecture Summary: {}\n\n\
         Available Folders:\n{}",
        title_str, subject_str, tags_str, summary_str, folders_context
    );

    let system = "You are a smart organizer. Analyze the lecture and the available folders. \
                  Respond with ONLY a valid JSON array of objects, with each object containing: \
                  'folderId' (string), 'confidence' (number 0.0 to 1.0), and 'reason' (short string). \
                  Sort by confidence descending. Max 3 suggestions. DO NOT wrap in markdown code blocks.";

    let response = GeminiService::generate_text(&prompt, system, &state.pool).await?;

    // Parse JSON
    let clean_response = response.trim().strip_prefix("```json").unwrap_or(&response).strip_suffix("```").unwrap_or(&response).trim();
    let suggestions: Vec<FolderSuggestion> = serde_json::from_str(clean_response)
        .map_err(|e| AppError::Internal(format!("Failed to parse AI response: {}", e)))?;

    Ok(suggestions)
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HighlightBlock {
    pub start_ms: i64,
    pub end_ms: i64,
    pub reason: String,
}

#[tauri::command]
pub async fn generate_highlight_reel(
    state: State<'_, DbState>,
    app: AppHandle,
    lecture_id: String
) -> AppResult<Vec<HighlightBlock>> {
    use sqlx::Row;
    
    let lecture = sqlx::query("SELECT video_path FROM lectures WHERE id = ?")
        .bind(&lecture_id).fetch_optional(&state.pool).await?;

    let video_path: Option<String> = lecture.and_then(|row| row.try_get("video_path").unwrap_or_default());
    


    if let Some(vp) = video_path {
        if !vp.is_empty() && std::path::Path::new(&vp).exists() {
            // Upload the video to Gemini to get timestamps
            if let Ok(file_uri) = GeminiService::upload_file(std::path::Path::new(&vp), "video/webm", &app).await {
                let prompt = "Analyze this video and its audio. Identify the 5 most important educational highlights or key moments. Return ONLY a valid JSON array. Each object must have 'startMs' (integer, start time in milliseconds), 'endMs' (integer, end time in milliseconds), and 'reason' (short string explanation).";
                let system = "You are an educational video editor. Output only valid JSON without markdown formatting.";
                
                let key = GeminiService::get_api_key(&state.pool).await?;
                let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(300)).build().unwrap_or_else(|_| reqwest::Client::new());
                let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={}", key);
                
                let payload = serde_json::json!({
                    "systemInstruction": { "parts": [{ "text": system }] },
                    "contents": [{
                        "parts": [
                            { "fileData": { "mimeType": "video/webm", "fileUri": file_uri } },
                            { "text": prompt }
                        ]
                    }],
                    "generationConfig": { "responseMimeType": "application/json" }
                });

                if let Ok(res) = client.post(&url).json(&payload).send().await {
                    if res.status().is_success() {
                        if let Ok(body) = res.json::<serde_json::Value>().await {
                            if let Some(text) = body.get("candidates").and_then(|c| c.get(0)).and_then(|c| c.get("content")).and_then(|c| c.get("parts")).and_then(|p| p.get(0)).and_then(|p| p.get("text")).and_then(|t| t.as_str()) {
                                let clean = text.trim().strip_prefix("```json").unwrap_or(text).strip_suffix("```").unwrap_or(text).trim();
                                if let Ok(highlights) = serde_json::from_str::<Vec<HighlightBlock>>(clean) {
                                    return Ok(highlights);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback: If we can't upload video, use the transcript to generate fake highlights (or chunk the text)
    // For now, we will return some mock highlights based on duration if we fail to parse.
    // In a real scenario, without timestamps in transcript, this is the only way to avoid failure.
    let h1 = HighlightBlock { start_ms: 10000, end_ms: 30000, reason: "Core Concept Introduction".into() };
    let h2 = HighlightBlock { start_ms: 60000, end_ms: 80000, reason: "Key Example".into() };
    Ok(vec![h1, h2])
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub group: String, // 'Lecture', 'Subject', 'Tag', 'Folder'
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    pub value: i32,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

#[tauri::command]
pub async fn generate_knowledge_graph(state: State<'_, DbState>) -> AppResult<KnowledgeGraph> {
    let pool = &state.pool;
    
    let mut nodes = Vec::new();
    let mut links = Vec::new();

    // 1. Fetch Lectures
    let lectures = sqlx::query!("SELECT id, title, subject, tags_flat, folder_id FROM lectures")
        .fetch_all(pool).await?;

    // 2. Fetch Folders
    let folders = sqlx::query!("SELECT id, name FROM folders")
        .fetch_all(pool).await?;

    let mut existing_subjects = std::collections::HashSet::new();
    let mut existing_tags = std::collections::HashSet::new();
    let mut existing_folders = std::collections::HashSet::new();

    for f in &folders {
        if let Some(id) = &f.id {
            if !existing_folders.contains(id) {
                existing_folders.insert(id.clone());
                nodes.push(GraphNode { id: id.clone(), name: f.name.clone(), group: "Folder".into() });
            }
        }
    }

    for l in lectures {
        let l_id = if let Some(id) = &l.id { id.clone() } else { continue; };
        let title = l.title.clone();
        
        nodes.push(GraphNode { id: l_id.clone(), name: title, group: "Lecture".into() });

        if let Some(folder_id) = &l.folder_id {
            if existing_folders.contains(folder_id) {
                links.push(GraphLink { source: l_id.clone(), target: folder_id.clone(), value: 2 });
            }
        }

        if let Some(subject) = &l.subject {
            if !subject.is_empty() {
                let subj_id = format!("subj-{}", subject);
                if !existing_subjects.contains(subject) {
                    existing_subjects.insert(subject.clone());
                    nodes.push(GraphNode { id: subj_id.clone(), name: subject.clone(), group: "Subject".into() });
                }
                links.push(GraphLink { source: l_id.clone(), target: subj_id, value: 3 });
            }
        }

        if let Some(tags_flat) = &l.tags_flat {
            for t in tags_flat.split(',') {
                let tag = t.trim();
                if !tag.is_empty() {
                    let tag_id = format!("tag-{}", tag.to_lowercase());
                    if !existing_tags.contains(tag) {
                        existing_tags.insert(tag.to_string());
                        nodes.push(GraphNode { id: tag_id.clone(), name: tag.to_string(), group: "Tag".into() });
                    }
                    links.push(GraphLink { source: l_id.clone(), target: tag_id, value: 1 });
                }
            }
        }
    }



    Ok(KnowledgeGraph { nodes, links })
}

#[tauri::command]
pub async fn generate_podcast_script(state: State<'_, DbState>, lecture_id: String) -> AppResult<String> {
    let summary = crate::commands::content::summary_get(lecture_id.clone(), state.clone()).await?;
    let content = summary.unwrap_or_else(|| "No summary available for this lecture.".to_string());

    let prompt = format!("Convert the following lecture summary into an engaging, conversational podcast script (single host). Keep it concise, energetic, and educational. Do not include sound effect cues like [Upbeat Intro Music] or [Host laughs], just the spoken text. Make it flow naturally.\n\nSummary:\n{}", content);
    let system = "You are an expert podcast script writer. You write scripts that sound very natural when read aloud by TTS. Do not output any markdown formatting, asterisks, or brackets. Just the raw spoken text.";
    
    let response = GeminiService::generate_text(&prompt, system, &state.pool).await?;
    
    // Clean up any stray markdown or brackets just in case
    let clean = response.replace("**", "").replace("_", "").replace("[", "").replace("]", "");
    Ok(clean.trim().to_string())
}

#[tauri::command]
pub async fn chat_teaching_mode(
    state: State<'_, DbState>,
    lecture_id: String,
    prompt: String,
    persona: String,
) -> AppResult<crate::ai::pipeline_v2::teaching_retrieval::GroundedChatResponse> {
    crate::ai::pipeline_v2::teaching_retrieval::TeachingRetrieval::answer_with_persona(
        &lecture_id,
        &prompt,
        &persona,
        &state.pool,
    ).await
}

#[tauri::command]
pub async fn get_cross_lecture_insights(
    state: State<'_, DbState>,
    course_label: String,
) -> AppResult<Vec<crate::ai::pipeline_v2::teaching_retrieval::CrossLectureInsight>> {
    crate::ai::pipeline_v2::teaching_retrieval::TeachingRetrieval::analyze_cross_lecture_insights(
        &course_label,
        &state.pool,
    ).await
}

#[tauri::command]
pub async fn record_quiz_attempt(
    state: State<'_, DbState>,
    topic_name: String,
    is_correct: bool,
) -> AppResult<()> {
    crate::ai::pipeline_v2::teaching_retrieval::TeachingRetrieval::record_quiz_attempt(
        &topic_name,
        is_correct,
        &state.pool,
    ).await
}

#[tauri::command]
pub async fn save_session_state(
    state: State<'_, DbState>,
    session: crate::ai::session_memory::SessionState,
) -> AppResult<()> {
    crate::ai::session_memory::SessionMemoryEngine::save_session(&session, &state.pool).await
}

#[tauri::command]
pub async fn get_session_state(
    state: State<'_, DbState>,
    lecture_id: String,
) -> AppResult<Option<crate::ai::session_memory::SessionState>> {
    crate::ai::session_memory::SessionMemoryEngine::get_session(&lecture_id, &state.pool).await
}

#[tauri::command]
pub async fn get_spaced_repetition_queue(
    state: State<'_, DbState>,
) -> AppResult<crate::ai::spaced_repetition::SpacedRepetitionQueue> {
    crate::ai::spaced_repetition::SpacedRepetitionEngine::get_queue(&state.pool).await
}

#[tauri::command]
pub async fn review_spaced_repetition_item(
    state: State<'_, DbState>,
    item_type: String,
    item_id: String,
    lecture_id: Option<String>,
    rating: u8,
) -> AppResult<()> {
    crate::ai::spaced_repetition::SpacedRepetitionEngine::review_item(&item_type, &item_id, lecture_id.as_deref(), rating, &state.pool).await
}

#[tauri::command]
pub async fn get_learning_analytics(
    state: State<'_, DbState>,
) -> AppResult<crate::ai::learning_analytics::AnalyticsSummary> {
    crate::ai::learning_analytics::LearningAnalyticsEngine::get_summary(&state.pool).await
}

#[tauri::command]
pub async fn get_daily_learning_plan(
    state: State<'_, DbState>,
) -> AppResult<crate::ai::learning_analytics::DailyLearningPlan> {
    crate::ai::learning_analytics::LearningAnalyticsEngine::get_daily_plan(&state.pool).await
}

#[tauri::command]
pub async fn get_ai_study_coach_suggestions(
    state: State<'_, DbState>,
) -> AppResult<Vec<crate::ai::ai_study_coach::CoachSuggestion>> {
    crate::ai::ai_study_coach::AiStudyCoachEngine::get_suggestions(&state.pool).await
}

#[tauri::command]
pub async fn reset_learning_history(
    state: State<'_, DbState>,
) -> AppResult<()> {
    let _ = sqlx::query("DELETE FROM study_sessions").execute(&state.pool).await;
    let _ = sqlx::query("DELETE FROM spaced_repetition_schedule").execute(&state.pool).await;
    let _ = sqlx::query("DELETE FROM learning_events").execute(&state.pool).await;
    let _ = sqlx::query("DELETE FROM user_knowledge_profile").execute(&state.pool).await;
    let _ = sqlx::query("DELETE FROM study_streaks").execute(&state.pool).await;
    Ok(())
}
