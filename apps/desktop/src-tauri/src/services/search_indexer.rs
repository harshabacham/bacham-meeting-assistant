use sqlx::SqlitePool;
use crate::error::AppResult;

pub struct SearchIndexer;

impl SearchIndexer {
    /// Spawns a background task to incrementally backfill all unindexed entities.
    pub fn run_backfill_background(pool: SqlitePool) {
        tokio::spawn(async move {
            if let Err(e) = Self::backfill_all(&pool).await {
                eprintln!("[SearchIndexer] Backfill failed: {}", e);
            }
        });
    }

    /// Performs a complete rebuild: clears the index and runs backfill.
    pub async fn rebuild(pool: &SqlitePool, _full: bool) -> AppResult<crate::commands::search::IndexRebuildResult> {
        let start = std::time::Instant::now();
        
        // Clear all search data
        sqlx::query("DELETE FROM global_search_index").execute(pool).await?;
        sqlx::query("DELETE FROM search_index_meta").execute(pool).await?;
        
        let processed = Self::backfill_all(pool).await?;
        
        Ok(crate::commands::search::IndexRebuildResult {
            entities_processed: processed,
            duration_ms: start.elapsed().as_millis() as u32,
        })
    }

    pub async fn status(pool: &SqlitePool) -> AppResult<crate::commands::search::IndexStatus> {
        let count_row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM search_index_meta")
            .fetch_one(pool)
            .await?;
            
        Ok(crate::commands::search::IndexStatus {
            total_documents: count_row.0 as u32,
            last_backfill_at: Some(chrono::Utc::now().to_rfc3339()), // Could track this in DB
            is_healthy: true,
        })
    }

    async fn backfill_all(pool: &SqlitePool) -> AppResult<u32> {
        let mut total_processed = 0;
        
        // 1. Lectures
        total_processed += Self::backfill_table(
            pool, "lecture", "lectures", "id",
            "NULL", "title", "course_label || ' ' || COALESCE(tags_flat, '')", 
            "json_object('course', course_label, 'teacher', teacher, 'semester', semester)",
            "NULL", "coalesce(updated_at, datetime('now'))", "last_opened_at", "coalesce(is_favorite, 0)", "coalesce(is_pinned, 0)", "0"
        ).await?;

        // 2. Folders
        total_processed += Self::backfill_table(
            pool, "folder", "folders", "id",
            "NULL", "name", "description", "NULL",
            "NULL", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 3. Collections
        total_processed += Self::backfill_table(
            pool, "collection", "collections", "id",
            "NULL", "name", "NULL", "NULL",
            "NULL", "coalesce(updated_at, datetime('now'))", "NULL", "0", "0", "0"
        ).await?;

        // 4. Transcripts
        total_processed += Self::backfill_table(
            pool, "transcript", "transcripts", "id",
            "lecture_id", "NULL", "content", "NULL",
            "lecture_id", "coalesce(generated_at, datetime('now'))", "NULL", "0", "0", "0"
        ).await?;

        // 5. Screenshots
        total_processed += Self::backfill_table(
            pool, "screenshot", "screenshots", "id",
            "lecture_id", "NULL", "ocr_text", "NULL",
            "lecture_id", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 6. Lecture Artifacts
        // artifact_type maps directly to entity_type
        total_processed += Self::backfill_table_dynamic_type(
            pool, "lecture_artifacts", "id", "artifact_type",
            "lecture_id", "NULL", "content_json", "NULL",
            "lecture_id", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 7. Notes
        total_processed += Self::backfill_table(
            pool, "note", "notes", "id",
            "lecture_id", "NULL", "content", "NULL",
            "lecture_id", "coalesce(updated_at, datetime('now'))", "NULL", "0", "0", "0"
        ).await?;

        // 8. Flashcards
        total_processed += Self::backfill_table(
            pool, "flashcard", "flashcards", "id",
            "lecture_id", "question", "answer", "NULL",
            "lecture_id", "coalesce(created_at, datetime('now'))", "NULL", "0", "0", "0"
        ).await?;

        // 9. Quizzes
        total_processed += Self::backfill_table(
            pool, "quiz", "quizzes", "id",
            "lecture_id", "question", "options", "NULL",
            "lecture_id", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 10. Timeline Events
        total_processed += Self::backfill_table(
            pool, "timeline_event", "timeline_events", "id",
            "lecture_id", "label", "event_type", "NULL",
            "lecture_id", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 11. Bookmarks
        total_processed += Self::backfill_table(
            pool, "bookmark", "bookmarks", "id",
            "lecture_id", "label", "note", "NULL",
            "lecture_id", "datetime('now')", "NULL", "0", "0", "0"
        ).await?;

        // 12. Conversations
        total_processed += Self::backfill_table(
            pool, "conversation", "conversations", "id",
            "NULL", "title", "scope_type", "NULL",
            "NULL", "coalesce(updated_at, datetime('now'))", "NULL", "coalesce(is_favorite, 0)", "coalesce(is_pinned, 0)", "coalesce(is_archived, 0)"
        ).await?;

        // 13. Messages
        total_processed += Self::backfill_table(
            pool, "message", "messages", "id",
            "NULL", "role", "content", "NULL",
            "NULL", "coalesce(created_at, datetime('now'))", "NULL", "0", "0", "0"
        ).await?;

        // 14. Static Commands
        total_processed += Self::seed_static_commands(pool).await?;

        Ok(total_processed)
    }

    async fn backfill_table(
        pool: &SqlitePool, 
        entity_type: &str, 
        table_name: &str, 
        id_col: &str,
        
        fts_parent_id_expr: &str,
        fts_title_expr: &str,
        fts_body_expr: &str,
        fts_meta_expr: &str,
        
        meta_parent_id_expr: &str,
        meta_updated_at_expr: &str,
        meta_last_opened_at_expr: &str,
        meta_is_fav_expr: &str,
        meta_is_pin_expr: &str,
        meta_is_arc_expr: &str,
    ) -> AppResult<u32> {
        let chunk_size = 500;
        let mut processed = 0;

        loop {
            // Find IDs not in meta
            let sql_find = format!(
                "SELECT {} AS id FROM {} WHERE {} NOT IN (SELECT entity_id FROM search_index_meta WHERE entity_type = '{}') LIMIT {}",
                id_col, table_name, id_col, entity_type, chunk_size
            );

            let rows = sqlx::query(&sql_find).fetch_all(pool).await?;
            if rows.is_empty() {
                break; // done with this table
            }

            use sqlx::Row;
            let ids: Vec<String> = rows.into_iter().map(|r| r.get("id")).collect();
            let id_list = ids.iter().map(|id| format!("'{}'", id.replace("'", "''"))).collect::<Vec<_>>().join(",");

            // Insert into FTS
            let sql_fts = format!(
                "INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body, metadata) \
                 SELECT '{}', {}, {}, {}, {}, {} FROM {} WHERE {} IN ({})",
                 entity_type, id_col, fts_parent_id_expr, fts_title_expr, fts_body_expr, fts_meta_expr, table_name, id_col, id_list
            );
            sqlx::query(&sql_fts).execute(pool).await?;

            // Insert into Meta
            let sql_meta = format!(
                "INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, last_opened_at, is_favorite, is_pinned, is_archived, popularity_score) \
                 SELECT '{}', {}, {}, {}, {}, {}, {}, {}, 0 FROM {} WHERE {} IN ({})",
                 entity_type, id_col, meta_parent_id_expr, meta_updated_at_expr, meta_last_opened_at_expr, meta_is_fav_expr, meta_is_pin_expr, meta_is_arc_expr, table_name, id_col, id_list
            );
            sqlx::query(&sql_meta).execute(pool).await?;

            processed += ids.len() as u32;

            // Yield slightly to not starve UI thread
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }

        Ok(processed)
    }
    
    // For lecture_artifacts where entity_type comes from the row itself
    async fn backfill_table_dynamic_type(
        pool: &SqlitePool, 
        table_name: &str, 
        id_col: &str,
        type_col: &str,
        
        fts_parent_id_expr: &str,
        fts_title_expr: &str,
        fts_body_expr: &str,
        fts_meta_expr: &str,
        
        meta_parent_id_expr: &str,
        meta_updated_at_expr: &str,
        meta_last_opened_at_expr: &str,
        meta_is_fav_expr: &str,
        meta_is_pin_expr: &str,
        meta_is_arc_expr: &str,
    ) -> AppResult<u32> {
        let chunk_size = 500;
        let mut processed = 0;

        loop {
            // Find IDs not in meta (matching both id and dynamic type)
            // This is slightly complex in SQL, so we do an outer join or NOT EXISTS
            let sql_find = format!(
                "SELECT {} AS id, {} AS etype FROM {} t \
                 WHERE NOT EXISTS (SELECT 1 FROM search_index_meta m WHERE m.entity_id = t.{} AND m.entity_type = t.{}) \
                 LIMIT {}",
                id_col, type_col, table_name, id_col, type_col, chunk_size
            );

            let rows = sqlx::query(&sql_find).fetch_all(pool).await?;
            if rows.is_empty() {
                break;
            }

            use sqlx::Row;
            let ids: Vec<String> = rows.into_iter().map(|r| r.get("id")).collect();
            let id_list = ids.iter().map(|id| format!("'{}'", id.replace("'", "''"))).collect::<Vec<_>>().join(",");

            // Insert into FTS
            let sql_fts = format!(
                "INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body, metadata) \
                 SELECT {}, {}, {}, {}, {}, {} FROM {} WHERE {} IN ({})",
                 type_col, id_col, fts_parent_id_expr, fts_title_expr, fts_body_expr, fts_meta_expr, table_name, id_col, id_list
            );
            sqlx::query(&sql_fts).execute(pool).await?;

            // Insert into Meta
            let sql_meta = format!(
                "INSERT INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at, last_opened_at, is_favorite, is_pinned, is_archived, popularity_score) \
                 SELECT {}, {}, {}, {}, {}, {}, {}, {}, 0 FROM {} WHERE {} IN ({})",
                 type_col, id_col, meta_parent_id_expr, meta_updated_at_expr, meta_last_opened_at_expr, meta_is_fav_expr, meta_is_pin_expr, meta_is_arc_expr, table_name, id_col, id_list
            );
            sqlx::query(&sql_meta).execute(pool).await?;

            processed += ids.len() as u32;

            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }

        Ok(processed)
    }

    async fn seed_static_commands(pool: &SqlitePool) -> AppResult<u32> {
        let commands = vec![
            ("cmd_settings", "Settings", "Open application settings configuration preferences"),
            ("cmd_record", "Start Recording", "Start a new lecture recording capture"),
            ("cmd_search", "Universal Search", "Search across everything in BACHAM"),
            ("cmd_theme", "Switch Theme", "Toggle dark mode light mode appearance"),
        ];

        let mut processed = 0;
        for (id, title, desc) in commands {
            // Check if exists
            let exists: (i32,) = sqlx::query_as("SELECT 1 FROM search_index_meta WHERE entity_type = 'command' AND entity_id = ?")
                .bind(id)
                .fetch_optional(pool).await?
                .unwrap_or((0,));
            
            if exists.0 == 0 {
                sqlx::query("INSERT INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body) VALUES ('command', ?, NULL, ?, ?)")
                    .bind(id).bind(title).bind(desc)
                    .execute(pool).await?;
                    
                sqlx::query("INSERT INTO search_index_meta(entity_type, entity_id, updated_at) VALUES ('command', ?, datetime('now'))")
                    .bind(id)
                    .execute(pool).await?;
                processed += 1;
            }
        }
        
        Ok(processed)
    }
}
