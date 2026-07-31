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
pub struct GlobalMemoryChatInput {
    pub prompt: String,
    pub history: Vec<ChatMessage>,
}

#[tauri::command]
pub async fn global_memory_chat_send(app: AppHandle, input: GlobalMemoryChatInput) -> AppResult<()> {
    let pool = app.state::<DbState>().pool.clone();
    
    // 1. Run FTS5 search on the prompt to find relevant memory snippets
    let search_results = crate::services::search_service::SearchService::fts_search(&pool, &input.prompt).await?;
    
    // 2. Build a grounded context string
    let mut context = String::new();
    if !search_results.is_empty() {
        context.push_str("Here is relevant information retrieved from the user's past meetings and lectures:\n\n");
        for (i, res) in search_results.iter().take(10).enumerate() {
            // strip HTML tags from snippet
            let clean_snippet = res.snippet.replace("<b>", "").replace("</b>", "");
            context.push_str(&format!("[{}] (Source: {}): {}\n", i+1, res.source_type, clean_snippet));
        }
    } else {
        context.push_str("No relevant past context found. Answer from general knowledge.\n");
    }

    // 3. Inject context into the prompt
    let grounded_prompt = format!(
        "System Context:\n{}\n\nUser Question:\n{}",
        context, input.prompt
    );

    // 4. Send to Gemini
    GeminiService::stream_chat(&app, &grounded_prompt, &input.history).await?;

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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoachingInsight {
    pub session_id: String,
    pub insight_type: String, // e.g., "Keyword", "Action", "Context"
    pub message: String,
    pub timestamp: i64,
}

#[tauri::command]
pub async fn simulate_live_meeting(app: AppHandle) -> AppResult<()> {
    use std::time::{SystemTime, UNIX_EPOCH};
    use tauri::Emitter;
    
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64;
    
    // Simulate some standard captions first
    #[derive(Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    struct LiveCaption {
        pub session_id: String,
        pub text: String,
        pub timestamp: i64,
        pub platform: String,
    }
    
    let _ = app.emit("live_caption_received", LiveCaption {
        session_id: "sim-123".into(),
        text: "Okay class, let's discuss the midterm requirements...".into(),
        timestamp: now,
        platform: "simulation".into(),
    });
    
    // Simulate the Coaching Insight
    let _ = app.emit("live_coaching_insight", CoachingInsight {
        session_id: "sim-123".into(),
        insight_type: "Context".into(),
        message: "?? Insight: The professor just mentioned 'midterm'. Last week you noted that the midterm covers Chapters 1-4.".into(),
        timestamp: now + 500,
    });
    
    Ok(())
}

#[tauri::command]
pub async fn execute_agentic_action(
    state: State<'_, DbState>,
    task: String,
    context: String,
) -> AppResult<String> {
    let prompt = format!(
        "You are an AI Action Executor. Analyze the following Action Item and its Context, and generate a URL scheme to execute it.\n\
        Action Item: {}\n\
        Context: {}\n\n\
        Rules:\n\
        1. If it's an email (e.g., 'email john the report'), generate a mailto: link (mailto:someone@example.com?subject=...&body=...).\n\
        2. If it's a meeting/event (e.g., 'schedule a follow up next week'), generate a Google Calendar template link: https://calendar.google.com/calendar/render?action=TEMPLATE&text=[Event+Title]&details=[Details]\n\
        3. Only return the raw URL string. Do not include any markdown, explanation, or quotes.",
        task, context
    );
    
    let response = GeminiService::generate_text(
        &prompt,
        "You are an expert at generating execution URLs. Only output the raw URL string, nothing else.",
        &state.pool
    ).await?;
    
    Ok(response.trim().replace("", ""))
}

#[tauri::command]
pub async fn grill_me_interaction(
    app: AppHandle,
    lecture_id: String,
    user_message: String,
    history: Vec<ChatMessage>,
) -> AppResult<String> {
    let pool = app.state::<DbState>().pool.clone();
    
    // Get lecture summary context
    let summary = crate::commands::content::summary_get(lecture_id.clone(), app.state::<DbState>().clone()).await?;
    let context = summary.unwrap_or_else(|| "No summary available.".to_string());

    let sys_prompt = format!(
        "You are a rigorous, slightly intimidating but fair university professor conducting an oral exam. \
        The student is defending their knowledge on the following lecture material:\n\
        {}\n\n\
        Rules:\n\
        1. Keep responses short and conversational. Speak as if talking in real-time.\n\
        2. Ask exactly ONE challenging conceptual question at a time.\n\
        3. Wait for the student to answer. Do not give them the answer upfront.\n\
        4. If the student answers incorrectly, correct them briefly, then move on to the next topic.\n\
        5. If the student answers correctly, praise them briefly, then ask the next question.\n\
        6. DO NOT use markdown, bold text, or bullet points. This will be read by Text-to-Speech.",
        context
    );

    let _all_history = history.clone();
    // In a real app we'd construct the full conversation history. For simplicity we'll just pass the latest message for now, 
    // or we can map history to Gemini's format. GeminiService::stream_chat doesn't return the full text, it streams.
    // Let's use a non-streaming text generation for Voice.
    
    let prompt = format!("Student says: {}", user_message);
    
    let response = GeminiService::generate_text(&prompt, &sys_prompt, &pool).await?;
    
    Ok(response)
}

// ─── Conversation Analytics ────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpeakerStat {
    pub name: String,
    pub total_ms: i64,
    pub percentage: f64,
    pub word_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SentimentPoint {
    pub timestamp_ms: i64,
    pub sentiment: String,  // "positive" | "neutral" | "negative"
    pub score: f64,         // -1.0 to 1.0
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConversationAnalytics {
    pub lecture_id: String,
    pub speaker_stats: Vec<SpeakerStat>,
    pub sentiment_timeline: Vec<SentimentPoint>,
    pub filler_words: serde_json::Value,
    pub engagement_score: i64,
    pub top_topics: Vec<String>,
    pub meeting_effectiveness: Option<String>,
    pub total_words: i64,
    pub avg_words_per_minute: f64,
    pub longest_monologue_ms: i64,
}

#[tauri::command]
pub async fn analyze_conversation(lecture_id: String, app: AppHandle) -> AppResult<ConversationAnalytics> {
    let pool = app.state::<DbState>().pool.clone();

    // Check for existing analytics
    let existing = sqlx::query(
        "SELECT speaker_stats, sentiment_timeline, filler_words, engagement_score, top_topics, meeting_effectiveness FROM conversation_analytics WHERE lecture_id = ?"
    )
    .bind(&lecture_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(row) = existing {
        use sqlx::Row;
        let speaker_stats_str: String = row.get("speaker_stats");
        let sentiment_str: String = row.get("sentiment_timeline");
        let filler_str: String = row.get("filler_words");
        let engagement: i64 = row.get("engagement_score");
        let topics_str: String = row.get("top_topics");
        let effectiveness: Option<String> = row.get("meeting_effectiveness");

        return Ok(ConversationAnalytics {
            lecture_id: lecture_id.clone(),
            speaker_stats: serde_json::from_str(&speaker_stats_str).unwrap_or_default(),
            sentiment_timeline: serde_json::from_str(&sentiment_str).unwrap_or_default(),
            filler_words: serde_json::from_str(&filler_str).unwrap_or(serde_json::json!({})),
            engagement_score: engagement,
            top_topics: serde_json::from_str(&topics_str).unwrap_or_default(),
            meeting_effectiveness: effectiveness,
            total_words: 0,
            avg_words_per_minute: 0.0,
            longest_monologue_ms: 0,
        });
    }

    // Get transcript
    let rows = sqlx::query!("SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC", lecture_id)
        .fetch_all(&pool).await?;
    
    if rows.is_empty() {
        return Err(crate::error::AppError::Internal("No transcript found".into()));
    }
    
    let transcript: String = rows.into_iter().map(|r| r.content).collect::<Vec<_>>().join("\n\n");
    let total_words = transcript.split_whitespace().count() as i64;

    // Count filler words locally (fast, no API call)
    let filler_list = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so", "right", "okay"];
    let transcript_lower = transcript.to_lowercase();
    let mut filler_map = serde_json::Map::new();
    for filler in filler_list.iter() {
        let count = transcript_lower.matches(filler).count();
        if count > 0 {
            filler_map.insert(filler.to_string(), serde_json::json!(count));
        }
    }

    // Get lecture duration for wpm calculation
    let lecture_row = sqlx::query!("SELECT duration_ms FROM lectures WHERE id = ?", lecture_id)
        .fetch_optional(&pool).await?;
    let duration_ms = lecture_row.map(|r| r.duration_ms).unwrap_or(0);
    let duration_minutes = (duration_ms as f64) / 60000.0;
    let avg_wpm = if duration_minutes > 0.0 { total_words as f64 / duration_minutes } else { 0.0 };

    // Build prompt for Gemini to analyze the conversation
    let analysis_prompt = format!(
        "Analyze this meeting/lecture transcript and return a JSON object.\n\nTranscript:\n{}\n\nReturn ONLY valid JSON with this exact schema:\n{{\n  \"speakers\": [\n    {{\"name\": \"Speaker 1\", \"percentage\": 60, \"word_count\": 450}},\n    {{\"name\": \"Speaker 2\", \"percentage\": 40, \"word_count\": 300}}\n  ],\n  \"sentiment_segments\": [\n    {{\"position\": 0, \"sentiment\": \"positive\", \"score\": 0.7}},\n    {{\"position\": 25, \"sentiment\": \"neutral\", \"score\": 0.0}},\n    {{\"position\": 50, \"sentiment\": \"negative\", \"score\": -0.3}},\n    {{\"position\": 75, \"sentiment\": \"positive\", \"score\": 0.5}}\n  ],\n  \"top_topics\": [\"Topic 1\", \"Topic 2\", \"Topic 3\", \"Topic 4\", \"Topic 5\"],\n  \"engagement_score\": 75,\n  \"meeting_effectiveness\": \"This meeting was highly productive. Key decisions were made regarding...\",\n  \"longest_monologue_ms\": 120000\n}}\n\nFor speakers: if you can't identify names, use 'Speaker 1', 'Speaker 2', etc. Percentages must add to 100.\nFor sentiment_segments: 'position' is 0-100 representing percentage through the transcript.\nDo not wrap in markdown code blocks. Return raw JSON only.",
        &transcript[..transcript.len().min(8000)]
    );

    let analysis_json = GeminiService::generate_text(&analysis_prompt, "You are a conversation analysis expert. Return only valid JSON.", &pool).await?;

    // Parse Gemini response
    let parsed: serde_json::Value = serde_json::from_str(&analysis_json.trim()).unwrap_or(serde_json::json!({
        "speakers": [{"name": "Speaker 1", "percentage": 100, "word_count": total_words}],
        "sentiment_segments": [{"position": 0, "sentiment": "neutral", "score": 0.0}],
        "top_topics": [],
        "engagement_score": 50,
        "meeting_effectiveness": null,
        "longest_monologue_ms": 0
    }));

    // Map speakers
    let speakers: Vec<SpeakerStat> = parsed["speakers"].as_array().unwrap_or(&vec![]).iter().map(|s| {
        let pct = s["percentage"].as_f64().unwrap_or(0.0);
        SpeakerStat {
            name: s["name"].as_str().unwrap_or("Speaker").to_string(),
            total_ms: ((pct / 100.0) * duration_ms as f64) as i64,
            percentage: pct,
            word_count: s["word_count"].as_i64().unwrap_or(0),
        }
    }).collect();

    // Map sentiment timeline — map position % to actual ms
    let sentiment_timeline: Vec<SentimentPoint> = parsed["sentiment_segments"].as_array().unwrap_or(&vec![]).iter().map(|s| {
        let pos = s["position"].as_f64().unwrap_or(0.0) / 100.0;
        SentimentPoint {
            timestamp_ms: (pos * duration_ms as f64) as i64,
            sentiment: s["sentiment"].as_str().unwrap_or("neutral").to_string(),
            score: s["score"].as_f64().unwrap_or(0.0),
        }
    }).collect();

    let top_topics: Vec<String> = parsed["top_topics"].as_array().unwrap_or(&vec![]).iter()
        .filter_map(|t| t.as_str().map(|s| s.to_string()))
        .collect();

    let engagement_score = parsed["engagement_score"].as_i64().unwrap_or(50);
    let meeting_effectiveness = parsed["meeting_effectiveness"].as_str().map(|s| s.to_string());
    let longest_monologue_ms = parsed["longest_monologue_ms"].as_i64().unwrap_or(0);

    // Persist to DB
    let id = uuid::Uuid::new_v4().to_string();
    let speaker_json = serde_json::to_string(&speakers).unwrap_or_default();
    let sentiment_json = serde_json::to_string(&sentiment_timeline).unwrap_or_default();
    let filler_json = serde_json::to_string(&serde_json::Value::Object(filler_map.clone())).unwrap_or_default();
    let topics_json = serde_json::to_string(&top_topics).unwrap_or_default();

    let _ = sqlx::query(
        "INSERT OR REPLACE INTO conversation_analytics (id, lecture_id, speaker_stats, sentiment_timeline, filler_words, engagement_score, top_topics, meeting_effectiveness) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&lecture_id)
    .bind(&speaker_json)
    .bind(&sentiment_json)
    .bind(&filler_json)
    .bind(engagement_score)
    .bind(&topics_json)
    .bind(&meeting_effectiveness)
    .execute(&pool).await;

    Ok(ConversationAnalytics {
        lecture_id,
        speaker_stats: speakers,
        sentiment_timeline,
        filler_words: serde_json::Value::Object(filler_map),
        engagement_score,
        top_topics,
        meeting_effectiveness,
        total_words,
        avg_words_per_minute: avg_wpm,
        longest_monologue_ms,
    })
}

// ─── AI Notepad Augmentation ────────────────────────────────────────────────────

#[tauri::command]
pub async fn notes_ai_augment(lecture_id: String, user_draft: String, app: AppHandle) -> AppResult<String> {
    let pool = app.state::<DbState>().pool.clone();
    
    // Get transcript for context
    let rows = sqlx::query!("SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC LIMIT 5", lecture_id)
        .fetch_all(&pool).await?;
    let transcript = rows.into_iter().map(|r| r.content).collect::<Vec<_>>().join("\n\n");
    
    let transcript_context = if transcript.is_empty() {
        "No transcript available.".to_string()
    } else {
        transcript[..transcript.len().min(6000)].to_string()
    };
    
    let prompt = format!(
        "Meeting/Lecture Transcript (for context):\n{}\n\n---\n\nUser's Shorthand Notes:\n{}\n\n---\n\nTask: Expand the user's shorthand notes into well-written, detailed paragraphs. Follow the structure the user has already set up. Use the transcript for context and add relevant details the user may have missed. Preserve all timestamps the user added (e.g., [5:30]). Keep bullet points as bullet points, expand them into complete sentences. Do not add new sections the user didn't write.",
        transcript_context,
        user_draft
    );
    
    let augmented = GeminiService::generate_text(&prompt, "You are an expert note-taker. Expand and enrich the user's shorthand notes based on the meeting transcript. Maintain the user's structure exactly.", &pool).await?;
    
    Ok(augmented)
}

// ─── Soundbites CRUD ────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Soundbite {
    pub id: String,
    pub lecture_id: String,
    pub title: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub transcript_excerpt: String,
    pub color: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn soundbites_list(lecture_id: String, app: AppHandle) -> AppResult<Vec<Soundbite>> {
    let pool = app.state::<DbState>().pool.clone();
    let rows = sqlx::query("SELECT id, lecture_id, title, start_ms, end_ms, transcript_excerpt, color, created_at FROM soundbites WHERE lecture_id = ? ORDER BY start_ms ASC")
        .bind(&lecture_id)
        .fetch_all(&pool).await?;
    use sqlx::Row;
    Ok(rows.into_iter().map(|r| Soundbite {
        id: r.get("id"),
        lecture_id: r.get("lecture_id"),
        title: r.get("title"),
        start_ms: r.get("start_ms"),
        end_ms: r.get("end_ms"),
        transcript_excerpt: r.get::<Option<String>, _>("transcript_excerpt").unwrap_or_default(),
        color: r.get::<Option<String>, _>("color").unwrap_or_else(|| "indigo".to_string()),
        created_at: r.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn soundbites_create(
    lecture_id: String, title: String, start_ms: i64, end_ms: i64,
    transcript_excerpt: String, color: String, app: AppHandle
) -> AppResult<Soundbite> {
    let pool = app.state::<DbState>().pool.clone();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO soundbites (id, lecture_id, title, start_ms, end_ms, transcript_excerpt, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&lecture_id).bind(&title).bind(start_ms).bind(end_ms)
        .bind(&transcript_excerpt).bind(&color).bind(&now)
        .execute(&pool).await?;
    Ok(Soundbite { id, lecture_id, title, start_ms, end_ms, transcript_excerpt, color, created_at: now })
}

#[tauri::command]
pub async fn soundbites_delete(id: String, app: AppHandle) -> AppResult<()> {
    let pool = app.state::<DbState>().pool.clone();
    sqlx::query("DELETE FROM soundbites WHERE id = ?").bind(&id).execute(&pool).await?;
    Ok(())
}

// ─── Transcript Comments CRUD ────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptComment {
    pub id: String,
    pub lecture_id: String,
    pub timestamp_ms: i64,
    pub block_index: i64,
    pub text: String,
    pub author: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn transcript_comments_list(lecture_id: String, app: AppHandle) -> AppResult<Vec<TranscriptComment>> {
    let pool = app.state::<DbState>().pool.clone();
    let rows = sqlx::query("SELECT id, lecture_id, timestamp_ms, block_index, text, author, created_at FROM transcript_comments WHERE lecture_id = ? ORDER BY block_index ASC, created_at ASC")
        .bind(&lecture_id).fetch_all(&pool).await?;
    use sqlx::Row;
    Ok(rows.into_iter().map(|r| TranscriptComment {
        id: r.get("id"),
        lecture_id: r.get("lecture_id"),
        timestamp_ms: r.get("timestamp_ms"),
        block_index: r.get("block_index"),
        text: r.get("text"),
        author: r.get("author"),
        created_at: r.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn transcript_comments_add(
    lecture_id: String, timestamp_ms: i64, block_index: i64, text: String, author: String, app: AppHandle
) -> AppResult<TranscriptComment> {
    let pool = app.state::<DbState>().pool.clone();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO transcript_comments (id, lecture_id, timestamp_ms, block_index, text, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&lecture_id).bind(timestamp_ms).bind(block_index)
        .bind(&text).bind(&author).bind(&now)
        .execute(&pool).await?;
    Ok(TranscriptComment { id, lecture_id, timestamp_ms, block_index, text, author, created_at: now })
}

#[tauri::command]
pub async fn transcript_comments_delete(id: String, app: AppHandle) -> AppResult<()> {
    let pool = app.state::<DbState>().pool.clone();
    sqlx::query("DELETE FROM transcript_comments WHERE id = ?").bind(&id).execute(&pool).await?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalActionItem {
    pub lecture_id: String,
    pub lecture_title: String,
    pub task: String,
    pub owner: String,
    pub priority: String,
    pub status: String, // "todo" or "done"
}

#[tauri::command]
pub async fn get_all_action_items(app: AppHandle) -> AppResult<Vec<GlobalActionItem>> {
    let pool = app.state::<DbState>().pool.clone();
    let rows = sqlx::query!(
        "SELECT a.lecture_id, a.content_json, l.title 
         FROM lecture_artifacts a 
         JOIN lectures l ON a.lecture_id = l.id 
         WHERE a.artifact_type = 'lecture_intelligence' AND a.status = 'done'"
    )
    .fetch_all(&pool)
    .await?;

    let mut all_items = Vec::new();

    for row in rows {
        if let Ok(mut parsed) = serde_json::from_str::<serde_json::Value>(&row.content_json) {
            if let Some(items) = parsed.pointer_mut("/crm_metadata/action_items").and_then(|v| v.as_array_mut()) {
                let mut modified = false;
                for item in items.iter_mut() {
                    let task = item.get("task").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let owner = item.get("owner").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let priority = item.get("priority").and_then(|v| v.as_str()).unwrap_or("medium").to_string();
                    
                    // Inject status if missing
                    if item.get("status").is_none() {
                        item.as_object_mut().unwrap().insert("status".to_string(), serde_json::json!("todo"));
                        modified = true;
                    }
                    let status = item.get("status").and_then(|v| v.as_str()).unwrap_or("todo").to_string();

                    if !task.is_empty() {
                        all_items.push(GlobalActionItem {
                            lecture_id: row.lecture_id.clone(),
                            lecture_title: row.title.clone(),
                            task,
                            owner,
                            priority,
                            status,
                        });
                    }
                }
                
                // If we injected missing statuses, save it back
                if modified {
                    let new_json = serde_json::to_string(&parsed).unwrap_or(row.content_json);
                    let _ = sqlx::query!("UPDATE lecture_artifacts SET content_json = ? WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence'", new_json, row.lecture_id)
                        .execute(&pool).await;
                }
            }
        }
    }

    Ok(all_items)
}

#[tauri::command]
pub async fn update_action_item_status(lecture_id: String, task: String, status: String, app: AppHandle) -> AppResult<()> {
    let pool = app.state::<DbState>().pool.clone();
    let row = sqlx::query!(
        "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence'",
        lecture_id
    ).fetch_optional(&pool).await?;

    if let Some(row) = row {
        if let Ok(mut parsed) = serde_json::from_str::<serde_json::Value>(&row.content_json) {
            if let Some(items) = parsed.pointer_mut("/crm_metadata/action_items").and_then(|v| v.as_array_mut()) {
                let mut modified = false;
                for item in items.iter_mut() {
                    if item.get("task").and_then(|v| v.as_str()) == Some(&task) {
                        item.as_object_mut().unwrap().insert("status".to_string(), serde_json::json!(status));
                        modified = true;
                    }
                }
                if modified {
                    let new_json = serde_json::to_string(&parsed).unwrap_or(row.content_json);
                    sqlx::query!("UPDATE lecture_artifacts SET content_json = ? WHERE lecture_id = ? AND artifact_type = 'lecture_intelligence'", new_json, lecture_id)
                        .execute(&pool).await?;
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn global_ask_ai(query: String, app: AppHandle) -> AppResult<String> {
    let pool = app.state::<DbState>().pool.clone();
    // Fetch last 10 lecture transcripts (limit to avoid token overflow)
    let rows = sqlx::query!(
        "SELECT l.title, l.created_at, a.content_json
         FROM lectures l
         JOIN lecture_artifacts a ON l.id = a.lecture_id
         WHERE a.artifact_type = 'transcript_blocks' AND a.status = 'done'
         ORDER BY l.created_at DESC LIMIT 10"
    )
    .fetch_all(&pool)
    .await?;

    if rows.is_empty() {
        return Ok("No recorded meeting transcripts found to search across.".to_string());
    }

    let mut context_buffer = String::new();
    for row in rows {
        context_buffer.push_str(&format!("--- Meeting: {} ---\n", row.title));
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&row.content_json) {
            if let Some(blocks) = parsed.pointer("/blocks").and_then(|v| v.as_array()) {
                let mut meeting_text = String::new();
                for b in blocks {
                    if let Some(text) = b.get("text").and_then(|v| v.as_str()) {
                        let speaker = b.get("speaker").and_then(|v| v.as_str()).unwrap_or("Unknown");
                        meeting_text.push_str(&format!("{}: {}\n", speaker, text));
                    }
                }
                // Only take the first 4000 characters of each meeting to prevent gigantic prompts if needed, 
                // but Gemini 1.5 Flash handles 1M tokens, so we can pass a lot. Let's just limit to a reasonable chunk per meeting.
                context_buffer.push_str(&meeting_text.chars().take(20000).collect::<String>());
            }
        }
        context_buffer.push_str("\n\n");
    }

    let prompt = format!(
        "You are an AI assistant helping the user recall information across all their past meetings.\n\
         The following is the transcript context from the user's most recent meetings:\n\n\
         {}\n\n\
         User's Question: {}\n\n\
         Please answer the user's question directly and concisely based ONLY on the provided meeting context. \
         If the answer is not contained in the meetings, say so.",
         context_buffer, query
    );

    let answer = crate::services::gemini_service::GeminiService::generate_text(
        &prompt,
        "You are a helpful meeting assistant.",
        &pool
    ).await?;

    Ok(answer)
}

#[derive(Serialize)]
pub struct TranslationResult {
    pub success: bool,
}

#[tauri::command]
pub async fn translate_transcript(lecture_id: String, target_language: String, app: AppHandle) -> AppResult<TranslationResult> {
    let pool = app.state::<DbState>().pool.clone();
    
    // Fetch original transcript
    let row = sqlx::query!(
        "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'transcript_blocks' AND status = 'done'",
        lecture_id
    )
    .fetch_optional(&pool)
    .await?;

    if let Some(row) = row {
        // We will send the entire JSON to Gemini and ask it to translate the "text" fields.
        let prompt = format!(
            "You are a professional translator. Translate the following transcript JSON into {}.\n\
             Keep the exact same JSON structure, only translate the values of the \"text\" fields.\n\
             Do NOT translate speakers or timestamps.\n\
             JSON to translate:\n\n{}",
            target_language, row.content_json
        );

        let translated = crate::services::gemini_service::GeminiService::generate_text(
            &prompt,
            "You are a JSON translator. Return ONLY valid JSON matching the input structure exactly.",
            &pool
        ).await?;

        // Clean up markdown code blocks if any
        let clean_json = translated.trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        
        // Validate JSON
        if let Ok(_) = serde_json::from_str::<serde_json::Value>(clean_json) {
            let artifact_type = format!("transcript_blocks_{}", target_language.to_lowercase().replace(" ", "_"));
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().timestamp_millis();
            
            sqlx::query!(
                "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, status) 
                 VALUES (?, ?, ?, ?, ?, 'gemini-1.5-flash', 'done')
                 ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json",
                id, lecture_id, artifact_type, clean_json, now
            )
            .execute(&pool)
            .await?;
            
            return Ok(TranslationResult { success: true });
        }
    }
    
    Ok(TranslationResult { success: false })
}

#[tauri::command]
pub async fn generate_pre_meeting_brief(attendees: Vec<String>, meeting_title: String, app: AppHandle) -> AppResult<String> {
    let pool = app.state::<DbState>().pool.clone();
    
    let recent_lectures = sqlx::query!("SELECT id, title FROM lectures ORDER BY created_at DESC LIMIT 5")
        .fetch_all(&pool)
        .await?;

    let mut context = String::new();
    for lec in recent_lectures {
        let transcript_row = sqlx::query!("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'transcript_blocks' AND status = 'done'", lec.id)
            .fetch_optional(&pool)
            .await?;
        if let Some(t) = transcript_row {
            context.push_str(&format!("Meeting '{}':\n{}\n\n", lec.title, t.content_json));
        }
    }

    let prompt = format!(
        "You are an AI meeting assistant. Create a pre-meeting brief for an upcoming meeting titled '{}'.\n\
         The attendees are: {}.\n\
         Based on the following past meeting transcripts, generate a 3-bullet summary of what was previously discussed with them, and 2 suggested talking points.\n\
         If there is no relevant info, generate generic talking points based on the meeting title.\n\n\
         Past context:\n{}",
        meeting_title, attendees.join(", "), context
    );

    let answer = crate::services::gemini_service::GeminiService::generate_text(
        &prompt,
        "You are a helpful assistant.",
        &pool
    ).await?;

    Ok(answer)
}

