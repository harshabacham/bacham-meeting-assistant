use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::search_service::{SearchService, SearchResult};

#[derive(Deserialize)]
pub struct LibraryFilters {
    pub subjects: Option<Vec<String>>,
    pub teachers: Option<Vec<String>>,
    pub semesters: Option<Vec<String>>,
    // Add other filter fields as needed
}

#[derive(Deserialize)]
pub struct SortSpec {
    pub field: String,
    pub descending: bool,
}

#[derive(Serialize)]
pub struct SearchPage {
    pub items: Vec<SearchResult>, // Might need a new struct, but SearchResult works for now
    pub next_cursor: Option<String>,
    pub total_count: u32,
}

#[tauri::command]
pub async fn search_query(
    query: String,
    mode: Option<String>,
    state: State<'_, DbState>,
) -> AppResult<Vec<SearchResult>> {
    match mode.as_deref() {
        Some("smart") => SearchService::smart_search(&state.pool, &query).await,
        _ => SearchService::fts_search(&state.pool, &query).await,
    }
}

#[tauri::command]
pub async fn folder_search(
    state: State<'_, DbState>,
    folder_id: String,
    query: String,
) -> AppResult<Vec<UniversalSearchResult>> {
    let clean_query = query.replace("'", "''");
    
    // We search across lectures (via lectures_fts) in this folder or its immediate children
    let sql = format!(
        "SELECT l.id as entity_id, f.title, snippet(lectures_fts, 1, '<b>', '</b>', '...', 64) as snippet, 
                l.updated_at, rank as score
         FROM lectures_fts f
         JOIN lectures l ON f.rowid = l.rowid
         WHERE lectures_fts MATCH '\"{}*\"'
           AND (l.folder_id = ? OR l.folder_id IN (SELECT id FROM folders WHERE parent_id = ?))
           AND l.trashed_at IS NULL
         ORDER BY rank
         LIMIT 50", clean_query
    );

    let rows = sqlx::query(&sql)
        .bind(&folder_id)
        .bind(&folder_id)
        .fetch_all(&state.pool)
        .await?;

    use sqlx::Row;
    let mut results = Vec::new();
    for row in rows {
        results.push(UniversalSearchResult {
            entity_type: "lecture".to_string(),
            entity_id: row.get("entity_id"),
            parent_lecture_id: None,
            title: row.get("title"),
            body_snippet: row.get("snippet"),
            score: row.get::<f64, _>("score") as f32,
            updated_at: row.get("updated_at"),
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn search_library(
    _state: State<'_, DbState>,
    _query: String,
    _filters: LibraryFilters,
    _sort: SortSpec,
    _cursor: Option<String>,
    _limit: u32,
) -> AppResult<SearchPage> {
    unimplemented!()
}

// ============================================================
// UNIVERSAL SEARCH (Phase 0 Foundation)
// ============================================================

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub entity_types: Option<Vec<String>>,
    pub subject: Option<String>,
    pub folder: Option<String>,
    pub date_range: Option<(String, String)>,
    pub favorites_only: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SearchSort {
    Relevance,
    Newest,
    Oldest,
    Alphabetical,
    Duration,
    Popularity,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UniversalSearchResult {
    pub entity_type: String,
    pub entity_id: String,
    pub parent_lecture_id: Option<String>,
    pub title: Option<String>,
    pub body_snippet: Option<String>,
    pub score: f32,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UniversalSearchResults {
    // Grouped by entity type
    pub results_by_type: std::collections::HashMap<String, Vec<UniversalSearchResult>>,
    pub total_counts: std::collections::HashMap<String, u32>,
    pub best_overall: Vec<UniversalSearchResult>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSuggestion {
    pub text: String,
    pub suggestion_type: String, // 'history' | 'lecture' | 'subject'
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHistoryEntry {
    pub id: String,
    pub query: String,
    pub result_count: u32,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexRebuildResult {
    pub entities_processed: u32,
    pub duration_ms: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub total_documents: u32,
    pub last_backfill_at: Option<String>,
    pub is_healthy: bool,
}

#[tauri::command]
pub async fn universal_search(
    state: State<'_, DbState>,
    query: String,
    filters: SearchFilters,
    sort: SearchSort,
    limit_per_type: u32,
    _cursor: Option<String>,
) -> AppResult<UniversalSearchResults> {
    crate::services::search_service::SearchService::universal_search(
        &state.pool, 
        &query, 
        &filters, 
        &sort, 
        limit_per_type
    ).await
}

#[tauri::command]
pub async fn get_search_suggestions(state: State<'_, DbState>, partial_query: String) -> AppResult<Vec<SearchSuggestion>> {
    crate::services::search_service::SearchService::get_suggestions(&state.pool, &partial_query).await
}

#[tauri::command]
pub async fn record_search_history(state: State<'_, DbState>, query: String, result_count: u32) -> AppResult<()> {
    crate::services::search_service::SearchService::record_history(&state.pool, &query, result_count).await
}

#[tauri::command]
pub async fn list_search_history(state: State<'_, DbState>, limit: u32) -> AppResult<Vec<SearchHistoryEntry>> {
    crate::services::search_service::SearchService::list_history(&state.pool, limit).await
}

#[tauri::command]
pub async fn pin_search(state: State<'_, DbState>, query: String, pinned: bool) -> AppResult<()> {
    crate::services::search_service::SearchService::pin_history(&state.pool, &query, pinned).await
}

#[tauri::command]
pub async fn clear_search_history(state: State<'_, DbState>, entry_id: Option<String>) -> AppResult<()> {
    crate::services::search_service::SearchService::clear_history(&state.pool, entry_id).await
}

#[tauri::command]
pub async fn summarize_search_results(
    app: tauri::AppHandle,
    query: String,
    results: Vec<crate::commands::search::UniversalSearchResult>,
) -> Result<(), String> {
    use crate::ai::providers::{ProviderEngine, GenerationRequest};
    use crate::services::gemini_service::ChatMessage;

    let mut context_text = String::new();
    for (i, res) in results.iter().take(5).enumerate() {
        let title = res.title.as_deref().unwrap_or("Untitled");
        let snippet = res.body_snippet.as_deref().unwrap_or("");
        // FTS snippets have <b> tags, strip them for the AI prompt
        let plain_snippet = snippet.replace("<b>", "").replace("</b>", "");
        context_text.push_str(&format!("[{}] {}: {}\n", i+1, title, plain_snippet));
    }

    let provider = ProviderEngine::get_provider(&app).await.map_err(|e| e.to_string())?;
    
    let request = GenerationRequest {
        system_instruction: "You are an expert AI assistant. Answer the user's query using ONLY the provided search results context. If the context does not contain the answer, say you don't know.".to_string(),
        history: vec![
            ChatMessage {
                role: "user".to_string(),
                content: format!("Search Context:\n{}\n\nAnswer my query: {}", context_text, query),
            }
        ],
        prompt: "Generate summary".to_string(),
    };

    // Use a unique event name for search summary streaming
    provider.generate_stream(&app, request, "search://summary-chunk").await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn rebuild_search_index(state: State<'_, DbState>, full: bool) -> AppResult<IndexRebuildResult> {
    crate::services::search_indexer::SearchIndexer::rebuild(&state.pool, full).await
}

#[tauri::command]
pub async fn get_index_status(state: State<'_, DbState>) -> AppResult<IndexStatus> {
    crate::services::search_indexer::SearchIndexer::status(&state.pool).await
}

#[tauri::command]
pub async fn seed_stress_data(state: State<'_, DbState>) -> AppResult<String> {
    use uuid::Uuid;
    use chrono::Utc;
    use sqlx::QueryBuilder;

    let start = std::time::Instant::now();
    let batch_size = 1000;
    
    // Seed 10,000 lectures
    for i in 0..10 {
        let mut qb = QueryBuilder::new(
            "INSERT INTO lectures (id, course_label, teacher, semester, title, tags_flat, created_at, updated_at) "
        );
        qb.push_values(0..batch_size, |mut b, j| {
            let id = Uuid::new_v4().to_string();
            let title = format!("Stress Test Lecture {}", i * batch_size + j);
            let now = Utc::now().to_rfc3339();
            b.push_bind(id)
             .push_bind("CS101")
             .push_bind("Dr. Smith")
             .push_bind("Fall 2026")
             .push_bind(title)
             .push_bind("stress_test, performance")
             .push_bind(now.clone())
             .push_bind(now);
        });
        
        let query = qb.build();
        query.execute(&state.pool).await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    }
    
    let duration = start.elapsed();
    Ok(format!("Seeded 10,000 lectures in {} ms", duration.as_millis()))
}
