use sqlx::SqlitePool;
use serde::Serialize;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub lecture_id: String,
    pub snippet: String,
    pub source_type: String,
}

pub struct SearchService;

impl SearchService {
    /// Default FTS5 keyword search — fully offline, zero network calls.
    pub async fn search(pool: &SqlitePool, query: &str) -> AppResult<Vec<SearchResult>> {
        Self::fts_search(pool, query).await
    }

    /// FTS5 full-text search (default, always available).
    pub async fn fts_search(pool: &SqlitePool, query: &str) -> AppResult<Vec<SearchResult>> {
        use sqlx::Row;

        // Sanitize query for FTS5 (tokenize into prefix AND matches)
        let safe_query = query
            .replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), " ")
            .split_whitespace()
            .map(|s| format!("\"{}\"*", s))
            .collect::<Vec<_>>()
            .join(" AND ");
            
        let safe_query = if safe_query.is_empty() { "\"\"".to_string() } else { safe_query };

        let rows = match sqlx::query(
            r#"
            SELECT lecture_id, snippet(search_index, 1, '<b>', '</b>', '...', 64) as snippet,
                   source_type
            FROM search_index
            WHERE search_index MATCH ?
            ORDER BY rank
            LIMIT 20
            "#
        ).bind(&safe_query).fetch_all(pool).await {
            Ok(r) => r,
            Err(_) => {
                // Fallback: try without quotes if the query has special FTS5 chars
                sqlx::query(
                    r#"
                    SELECT lecture_id, snippet(search_index, 1, '<b>', '</b>', '...', 64) as snippet,
                           source_type
                    FROM search_index
                    WHERE search_index MATCH ?
                    ORDER BY rank
                    LIMIT 20
                    "#
                ).bind(query).fetch_all(pool).await?
            }
        };

        let results = rows.into_iter().map(|row| {
            SearchResult {
                lecture_id: row.get::<String, _>("lecture_id"),
                snippet: row.get::<String, _>("snippet"),
                source_type: row.get::<String, _>("source_type"),
            }
        }).collect();
        Ok(results)
    }

    /// Smart Search: merge FTS5 results with embedding cosine similarity.
    /// Only available when smart_search is enabled in settings and embeddings exist.
    pub async fn smart_search(pool: &SqlitePool, query: &str) -> AppResult<Vec<SearchResult>> {
        // 1. Get FTS5 results
        let mut fts_results = Self::fts_search(pool, query).await.unwrap_or_default();

        // 2. Get query embedding via Gemini
        match crate::services::gemini_service::GeminiService::embed_text(query, pool).await {
            Ok(query_embedding) => {
                // 3. Fetch all stored embeddings
                let embedding_rows = sqlx::query!(
                    "SELECT source_id, source_type, lecture_id, embedding_blob FROM embeddings"
                )
                .fetch_all(pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

                // 4. Compute cosine similarity for each stored embedding
                let mut scored: Vec<(String, String, f32)> = embedding_rows
                    .into_iter()
                    .filter_map(|row| {
                        let stored_vec = bytes_to_f32_vec(&row.embedding_blob);
                        if stored_vec.len() != query_embedding.len() {
                            return None;
                        }
                        let sim = cosine_similarity(&query_embedding, &stored_vec);
                        Some((row.lecture_id.unwrap_or_default(), row.source_type, sim))
                    })
                    .collect();

                // Sort by similarity descending
                scored.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

                // 5. Add high-similarity semantic results not already in FTS5 results
                let existing_lecture_ids: std::collections::HashSet<String> =
                    fts_results.iter().map(|r| r.lecture_id.clone()).collect();

                for (lecture_id, source_type, sim) in scored.iter().take(10) {
                    if *sim > 0.7 && !existing_lecture_ids.contains(lecture_id) {
                        fts_results.push(SearchResult {
                            lecture_id: lecture_id.clone(),
                            snippet: format!("Semantic match (similarity: {:.0}%)", sim * 100.0),
                            source_type: source_type.clone(),
                        });
                    }
                }
            }
            Err(e) => {
                eprintln!("[SearchService] Embedding failed, falling back to FTS5: {e}");
            }
        }

        Ok(fts_results)
    }

    /// Store an embedding for a piece of content.
    pub async fn store_embedding(
        pool: &SqlitePool,
        source_type: &str,
        source_id: &str,
        lecture_id: &str,
        embedding: &[f32],
    ) -> AppResult<()> {
        use uuid::Uuid;
        use chrono::Utc;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let blob = f32_vec_to_bytes(embedding);

        sqlx::query!(
            "INSERT OR REPLACE INTO embeddings \
             (id, source_type, source_id, lecture_id, embedding_blob, model, created_at) \
             VALUES (?, ?, ?, ?, ?, 'text-embedding-004', ?)",
            id, source_type, source_id, lecture_id, blob, now
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }

    // ============================================================
    // UNIVERSAL SEARCH (Phase 4 Implementation)
    // ============================================================

    pub async fn universal_search(
        pool: &SqlitePool,
        query: &str,
        filters: &crate::commands::search::SearchFilters,
        sort: &crate::commands::search::SearchSort,
        limit_per_type: u32,
    ) -> AppResult<crate::commands::search::UniversalSearchResults> {
        use sqlx::Row;
        use std::collections::HashMap;
        use crate::commands::search::UniversalSearchResult;
        let start_time = std::time::Instant::now();

        // Tokenize query for FTS5 prefix matching
        let safe_query = query
            .replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), " ")
            .split_whitespace()
            .map(|s| format!("\"{}\"*", s))
            .collect::<Vec<_>>()
            .join(" AND ");
            
        let safe_query = if safe_query.is_empty() { "\"\"".to_string() } else { safe_query };

        // Build dynamic SQL
        let mut sql = String::from(
            "SELECT \
                m.entity_type, m.entity_id, m.parent_lecture_id, m.updated_at, m.popularity_score, \
                fts.title, \
                snippet(global_search_index, 3, '<b>', '</b>', '...', 64) as title_snippet, \
                snippet(global_search_index, 4, '<b>', '</b>', '...', 64) as body_snippet, \
                fts.rank \
             FROM global_search_index fts \
             JOIN search_index_meta m ON fts.entity_type = m.entity_type AND fts.entity_id = m.entity_id \
             WHERE global_search_index MATCH ?"
        );

        // Filters
        if let Some(types) = &filters.entity_types {
            if !types.is_empty() {
                let types_list = types.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(",");
                sql.push_str(&format!(" AND m.entity_type IN ({})", types_list));
            }
        }
        if let Some(favs) = filters.favorites_only {
            if favs {
                sql.push_str(" AND m.is_favorite = 1");
            }
        }
        // Additional filters (subject, folder, date) could be added here later

        // Sort
        match sort {
            crate::commands::search::SearchSort::Relevance => sql.push_str(" ORDER BY fts.rank"),
            crate::commands::search::SearchSort::Newest => sql.push_str(" ORDER BY m.updated_at DESC"),
            crate::commands::search::SearchSort::Oldest => sql.push_str(" ORDER BY m.updated_at ASC"),
            crate::commands::search::SearchSort::Alphabetical => sql.push_str(" ORDER BY fts.title ASC"),
            crate::commands::search::SearchSort::Popularity => sql.push_str(" ORDER BY m.popularity_score DESC"),
            _ => sql.push_str(" ORDER BY fts.rank"),
        }
        
        // Use a generous overall limit, we will truncate per type in code
        sql.push_str(&format!(" LIMIT {}", limit_per_type * 5));

        let rows = sqlx::query(&sql).bind(&safe_query).fetch_all(pool).await?;

        let mut results_by_type: HashMap<String, Vec<UniversalSearchResult>> = HashMap::new();
        let mut total_counts: HashMap<String, u32> = HashMap::new();
        let mut best_overall: Vec<UniversalSearchResult> = Vec::new();

        for row in rows {
            let entity_type: String = row.get("entity_type");
            
            // Limit per type in memory
            let current_count = results_by_type.get(&entity_type).map(|v| v.len() as u32).unwrap_or(0);
            
            // Always track total counts for the query
            *total_counts.entry(entity_type.clone()).or_insert(0) += 1;

            if current_count < limit_per_type {
                let result = UniversalSearchResult {
                    entity_type: entity_type.clone(),
                    entity_id: row.get("entity_id"),
                    parent_lecture_id: row.try_get("parent_lecture_id").ok(),
                    title: row.try_get("title").ok(),
                    body_snippet: row.try_get("body_snippet").ok(),
                    score: row.get::<f64, _>("rank") as f32,
                    updated_at: row.get("updated_at"),
                };
                
                results_by_type
                    .entry(entity_type.clone())
                    .or_insert_with(Vec::new)
                    .push(result);
            }
        }
        
        // Build best_overall (e.g. top N across all types). Since SQL was already ordered, we just flatten and take top N
        for (_etype, list) in &results_by_type {
            // Need a clone for best_overall to avoid lifetime issues
            for r in list {
                best_overall.push(UniversalSearchResult {
                    entity_type: r.entity_type.clone(),
                    entity_id: r.entity_id.clone(),
                    parent_lecture_id: r.parent_lecture_id.clone(),
                    title: r.title.clone(),
                    body_snippet: r.body_snippet.clone(),
                    score: r.score,
                    updated_at: r.updated_at.clone(),
                });
            }
        }
        
        // Re-sort best_overall since HashMap iteration is unordered, or we can just sort by score.
        // Wait, if it was ordered in SQL, we can just grab from original rows for best_overall!
        let mut top_overall = Vec::new();
        let _sql_rows = sqlx::query(&sql).bind(&safe_query).fetch_all(pool).await?; // Safe since sqlite is fast, but better to re-use rows.
        
        // Actually, we can just take the first N from the already executed query:
        let top_n_rows = sqlx::query(&sql).bind(&safe_query).fetch_all(pool).await?;
        for row in top_n_rows.into_iter().take((limit_per_type * 2) as usize) {
             top_overall.push(UniversalSearchResult {
                entity_type: row.get("entity_type"),
                entity_id: row.get("entity_id"),
                parent_lecture_id: row.try_get("parent_lecture_id").ok(),
                title: row.try_get("title").ok(),
                body_snippet: row.try_get("body_snippet").ok(),
                score: row.get::<f64, _>("rank") as f32,
                updated_at: row.get("updated_at"),
            });
        }

        // TIER 2: Semantic Fallback
        if top_overall.is_empty() && !query.trim().is_empty() {
            if let Ok(query_embedding) = crate::services::gemini_service::GeminiService::embed_text(query, pool).await {
                if let Ok(embedding_rows) = sqlx::query!("SELECT source_id, source_type, lecture_id, embedding_blob FROM embeddings").fetch_all(pool).await {
                    let mut scored: Vec<_> = embedding_rows.into_iter().filter_map(|row| {
                        let stored = bytes_to_f32_vec(&row.embedding_blob);
                        if stored.len() == query_embedding.len() {
                            Some((row, cosine_similarity(&query_embedding, &stored)))
                        } else {
                            None
                        }
                    }).collect();
                    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                    
                    for (row, sim) in scored.into_iter().take(limit_per_type as usize) {
                        if sim > 0.65 {
                            top_overall.push(UniversalSearchResult {
                                entity_type: row.source_type.clone(),
                                entity_id: row.source_id.clone(),
                                parent_lecture_id: row.lecture_id,
                                title: Some(format!("Semantic Match ({:.0}%)", sim * 100.0)),
                                body_snippet: None,
                                score: sim,
                                updated_at: chrono::Utc::now().to_rfc3339(),
                            });
                        }
                    }
                }
            }
        }

        let duration = start_time.elapsed();
        eprintln!("[SearchService] universal_search for '{}' completed in {} ms", query, duration.as_millis());

        Ok(crate::commands::search::UniversalSearchResults {
            results_by_type,
            total_counts,
            best_overall: top_overall,
            next_cursor: None,
        })
    }

    pub async fn get_suggestions(pool: &SqlitePool, partial_query: &str) -> AppResult<Vec<crate::commands::search::SearchSuggestion>> {
        use sqlx::Row;
        use crate::commands::search::SearchSuggestion;
        
        let mut suggestions = Vec::new();
        let query_wildcard = format!("%{}%", partial_query);
        
        // 1. History matches
        let history_rows = sqlx::query(
            "SELECT DISTINCT query FROM search_history WHERE query LIKE ? ORDER BY created_at DESC LIMIT 3"
        )
        .bind(&query_wildcard)
        .fetch_all(pool)
        .await?;
        
        for row in history_rows {
            suggestions.push(SearchSuggestion {
                text: row.get("query"),
                suggestion_type: "history".to_string(),
            });
        }
        
        // 2. Title matches from FTS (quick match)
        let fts_query = format!("\"{}*\"", partial_query.replace('"', ""));
        let title_rows = sqlx::query(
            "SELECT title, entity_type FROM global_search_index WHERE global_search_index MATCH ? ORDER BY rank LIMIT 4"
        )
        .bind(&fts_query)
        .fetch_all(pool)
        .await?;
        
        for row in title_rows {
            if let Ok(title) = row.try_get::<String, _>("title") {
                if !title.is_empty() {
                    let etype: String = row.get("entity_type");
                    suggestions.push(SearchSuggestion {
                        text: title,
                        suggestion_type: etype,
                    });
                }
            }
        }
        
        Ok(suggestions)
    }

    pub async fn record_history(pool: &SqlitePool, query: &str, result_count: u32) -> AppResult<()> {
        use uuid::Uuid;
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO search_history (id, query, result_count) VALUES (?, ?, ?)"
        )
        .bind(id)
        .bind(query)
        .bind(result_count)
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn list_history(pool: &SqlitePool, limit: u32) -> AppResult<Vec<crate::commands::search::SearchHistoryEntry>> {
        use sqlx::Row;
        let rows = sqlx::query(
            "SELECT id, query, result_count, is_pinned, is_favorite, created_at FROM search_history ORDER BY is_pinned DESC, created_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        let entries = rows.into_iter().map(|row| {
            crate::commands::search::SearchHistoryEntry {
                id: row.get("id"),
                query: row.get("query"),
                result_count: row.get::<i64, _>("result_count") as u32,
                is_pinned: row.get::<bool, _>("is_pinned"),
                is_favorite: row.get::<bool, _>("is_favorite"),
                created_at: row.get("created_at"),
            }
        }).collect();
        
        Ok(entries)
    }

    pub async fn pin_history(pool: &SqlitePool, query: &str, pinned: bool) -> AppResult<()> {
        sqlx::query("UPDATE search_history SET is_pinned = ? WHERE query = ?")
            .bind(pinned)
            .bind(query)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn clear_history(pool: &SqlitePool, entry_id: Option<String>) -> AppResult<()> {
        if let Some(id) = entry_id {
            sqlx::query("DELETE FROM search_history WHERE id = ?")
                .bind(id)
                .execute(pool)
                .await?;
        } else {
            sqlx::query("DELETE FROM search_history WHERE is_pinned = 0")
                .execute(pool)
                .await?;
        }
        Ok(())
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if mag_a == 0.0 || mag_b == 0.0 {
        return 0.0;
    }
    dot / (mag_a * mag_b)
}

fn f32_vec_to_bytes(v: &[f32]) -> Vec<u8> {
    v.iter().flat_map(|f| f.to_le_bytes()).collect()
}

fn bytes_to_f32_vec(b: &[u8]) -> Vec<f32> {
    b.chunks_exact(4)
        .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
        .collect()
}
