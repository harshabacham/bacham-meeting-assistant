use tauri::State;
use std::path::PathBuf;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::export_service::ExportService;

#[tauri::command]
pub async fn export_lecture(
    lecture_id: String,
    format: String,
    dest: String,
    state: State<'_, DbState>,
) -> AppResult<()> {
    let path = PathBuf::from(dest);
    match format.as_str() {
        "markdown" => ExportService::export_markdown(&state.pool, &lecture_id, &path).await?,
        "pdf" => ExportService::export_pdf(&state.pool, &lecture_id, &path).await?,
        "html" => ExportService::export_html(&state.pool, &lecture_id, &path).await?,
        "json" => ExportService::export_json(&state.pool, &lecture_id, &path).await?,
        _ => return Err(crate::error::AppError::Internal("Unsupported export format".into())),
    }
    Ok(())
}

#[tauri::command]
pub async fn export_folder_cram_sheet(
    folder_id: String,
    dest: String,
    state: State<'_, DbState>,
) -> AppResult<()> {
    let path = PathBuf::from(dest);
    ExportService::export_folder_cram_sheet(&state.pool, &folder_id, &path).await?;
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightSegment {
    pub start_ms: i64,
    pub end_ms: i64,
    pub label: String,
}

#[tauri::command]
pub async fn generate_highlights_reel(
    lecture_id: String,
    segments: Vec<HighlightSegment>,
    dest: String,
    state: State<'_, DbState>,
    _app: tauri::AppHandle,
) -> AppResult<()> {
    // Basic mock implementation for generating a highlight reel video.
    // In a full production environment, this would spawn an `ffmpeg` process
    // that uses a filter_complex to concat the segments from the original webm file.
    let path = PathBuf::from(dest);
    
    // First, find the original video file
    let _video_path_row = sqlx::query!(
        "SELECT video_path FROM lectures WHERE id = ?",
        lecture_id
    )
    .fetch_optional(&state.pool)
    .await?;

    // Verify there are segments
    if segments.is_empty() {
        return Err(crate::error::AppError::Internal("No segments provided for highlight reel".into()));
    }

    // Mock implementation: just write a placeholder file
    // Real implementation would build an ffmpeg command like:
    // ffmpeg -i input.webm -filter_complex "[0:v]trim=start=10:end=20,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=10:end=20,asetpts=PTS-STARTPTS[a0];..." -map "[v]" -map "[a]" output.webm
    
    let content = format!("BACHAM HIGHLIGHT REEL\nLecture: {}\nSegments: {} clips.\nThis is a mock video file representing the compiled highlights.", lecture_id, segments.len());
    
    if let Err(e) = std::fs::write(&path, content) {
        return Err(crate::error::AppError::Internal(format!("Failed to write highlight reel: {}", e)));
    }

    Ok(())
}

#[tauri::command]
pub async fn generate_magic_link_html(
    lecture_id: String,
    dest: String,
    state: State<'_, DbState>,
) -> AppResult<String> {
    let pool = &state.pool;
    
    // Fetch lecture details
    let row = sqlx::query!("SELECT title, created_at FROM lectures WHERE id = ?", lecture_id)
        .fetch_optional(pool)
        .await?;
        
    if row.is_none() {
        return Err(crate::error::AppError::Internal("Lecture not found".into()));
    }
    let r = row.unwrap();
    let title = r.title;
    
    // Fetch summary
    let summary_row = sqlx::query!("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'summary' AND status = 'done'", lecture_id)
        .fetch_optional(pool)
        .await?;
    let summary = summary_row.map(|r| r.content_json).unwrap_or_else(|| "".to_string());
    
    // Fetch transcript
    let transcript_row = sqlx::query!("SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'transcript_blocks' AND status = 'done'", lecture_id)
        .fetch_optional(pool)
        .await?;
    let transcript = transcript_row.map(|r| r.content_json).unwrap_or_else(|| "[]".to_string());
    
    let title_json = serde_json::to_string(&title).unwrap_or_else(|_| "\"\"".to_string());
    let summary_json = serde_json::to_string(&summary).unwrap_or_else(|_| "\"\"".to_string());
    
    let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BACHAM Magic Link</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', sans-serif; background-color: #09090b; color: #fafafa; }}
        .glass-panel {{ background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); }}
    </style>
</head>
<body class="min-h-screen p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
        <header class="flex items-center justify-between mb-8 glass-panel p-4 md:p-6 rounded-2xl">
            <div>
                <h1 id="meeting-title" class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400"></h1>
                <p class="text-zinc-400 text-sm mt-1">BACHAM Shared Meeting</p>
            </div>
            <div class="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-medium">Magic Link</div>
        </header>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1 space-y-6">
                <div class="glass-panel p-5 rounded-2xl">
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        AI Summary
                    </h2>
                    <div id="summary-content" class="prose prose-invert prose-sm"></div>
                </div>
            </div>
            
            <div class="md:col-span-2">
                <div class="glass-panel p-5 rounded-2xl h-[600px] flex flex-col">
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Interactive Transcript
                    </h2>
                    <div id="transcript-content" class="overflow-y-auto pr-2 space-y-4 flex-1"></div>
                </div>
            </div>
        </div>
    </div>
    <script>
        const titleText = {title_json};
        const summaryRaw = {summary_json};
        const transcriptRaw = {transcript_json};
        
        document.getElementById('meeting-title').textContent = titleText;
        document.getElementById('summary-content').innerHTML = marked.parse(summaryRaw);
        
        const transcriptContainer = document.getElementById('transcript-content');
        if (Array.isArray(transcriptRaw)) {{
            transcriptRaw.forEach(block => {{
                const div = document.createElement('div');
                div.className = 'p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10';
                div.innerHTML = marked.parse(block);
                transcriptContainer.appendChild(div);
            }});
        }} else {{
            transcriptContainer.innerHTML = marked.parse(String(transcriptRaw));
        }}
    </script>
</body>
</html>"#, 
        title_json = title_json, 
        summary_json = summary_json,
        transcript_json = transcript
    );

    let path = std::path::PathBuf::from(&dest);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    }
    std::fs::write(&path, html).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;

    Ok(dest)
}
