use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use crate::commands::folders::Folder;
use crate::services::lecture_service::Lecture;
use crate::commands::chat::Conversation;
use chrono::Utc;

// Note: FolderNote will be defined more fully in Phase 4. We use a simplified version here for compilation.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderNote {
    pub id: String,
    pub folder_id: String,
    pub title: Option<String>,
    pub body_md: String,
    pub kind: String, // "scratchpad" | "study_guide" | "custom"
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderStatisticsCache {
    pub folder_id: String,
    pub lecture_count: i64,
    pub study_hours: f64,
    pub storage_bytes: i64,
    pub flashcard_count: i64,
    pub quiz_count: i64,
    pub note_count: i64,
    pub completion_pct: f64,
    pub computed_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderDashboard {
    pub folder: Folder,
    pub statistics: FolderStatisticsCache,
    pub recent_lectures: Vec<Lecture>,
    pub pinned_lectures: Vec<Lecture>,
    pub recent_chats: Vec<Conversation>,
    pub recent_notes: Vec<FolderNote>,
    pub continue_learning: Option<Lecture>,
}

#[tauri::command]
pub async fn get_folder_dashboard(state: State<'_, DbState>, id: String) -> AppResult<FolderDashboard> {
    let mut tx = state.pool.begin().await?;

    // 1. Get Folder
    let folder_row = sqlx::query!(
        "SELECT id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, trashed_at, created_at, updated_at 
         FROM folders WHERE id = ?", 
        id
    ).fetch_optional(&mut *tx).await?;

    let folder_row = match folder_row {
        Some(row) => row,
        None => return Err(AppError::Internal("Folder not found".into())),
    };

    let folder = Folder {
        id: folder_row.id.unwrap_or_default(),
        name: folder_row.name,
        parent_id: folder_row.parent_id,
        color: folder_row.color,
        icon: folder_row.icon,
        cover_image_path: folder_row.cover_image_path,
        description: folder_row.description,
        subject: folder_row.subject,
        semester: folder_row.semester,
        sort_order: folder_row.sort_order,
        is_locked: folder_row.is_locked.unwrap_or(false),
        is_favorite: folder_row.is_favorite == 1,
        is_pinned: folder_row.is_pinned == 1,
        is_archived: folder_row.is_archived == 1,
        trashed_at: folder_row.trashed_at,
        created_at: folder_row.created_at,
        updated_at: folder_row.updated_at,
    };

    // 2. Get Statistics (recompute if not found)
    let stats_row = sqlx::query!(
        "SELECT folder_id, lecture_count, study_hours, storage_bytes, flashcard_count, quiz_count, note_count, completion_pct, computed_at 
         FROM folder_statistics_cache WHERE folder_id = ?",
        id
    ).fetch_optional(&mut *tx).await?;

    let statistics = match stats_row {
        Some(s) => FolderStatisticsCache {
            folder_id: s.folder_id.unwrap_or_default(),
            lecture_count: s.lecture_count,
            study_hours: s.study_hours,
            storage_bytes: s.storage_bytes,
            flashcard_count: s.flashcard_count,
            quiz_count: s.quiz_count,
            note_count: s.note_count,
            completion_pct: s.completion_pct,
            computed_at: s.computed_at,
        },
        None => {
            // Recompute manually if it doesn't exist
            recompute_folder_statistics(state.clone(), id.clone()).await?
        }
    };

    // Fetch actual recent lectures for this folder
    let recent_lectures_rows = sqlx::query(
        "SELECT id, title, course_label, folder_id, created_at, updated_at, duration_ms, \
         source, is_favorite, is_pinned, video_path, deleted_at, color_label, course, semester, teacher, subject, is_archived, description \
         FROM lectures \
         WHERE folder_id = ? AND deleted_at IS NULL \
         ORDER BY created_at DESC \
         LIMIT 10"
    ).bind(id.clone()).fetch_all(&mut *tx).await?;

    let mut recent_lectures = Vec::new();
    for row in recent_lectures_rows {
        let row_id: String = sqlx::Row::try_get(&row, "id").unwrap_or_default();
        let tags_rows = sqlx::query!("SELECT t.name FROM tags t JOIN lecture_tags lt ON t.id = lt.tag_id WHERE lt.lecture_id = ?", row_id)
            .fetch_all(&mut *tx).await.unwrap_or_default();
        let tags = tags_rows.into_iter().map(|r| r.name).collect();
        recent_lectures.push(crate::services::lecture_service::LectureService::map_row(&row, tags));
    }

    let pinned_lectures = Vec::new();
    let recent_chats = Vec::new();

    // Fetch actual workspace notes tagged with this folder
    let folder_tag_pattern = format!("%\"folder:{}\"%", id);
    let note_rows = sqlx::query(
        "SELECT id, title, content_html, is_pinned, tags_json, created_at, updated_at 
         FROM workspace_notes 
         WHERE tags_json LIKE ? 
         ORDER BY updated_at DESC 
         LIMIT 10"
    ).bind(&folder_tag_pattern).fetch_all(&mut *tx).await.unwrap_or_default();

    let mut recent_notes = Vec::new();
    for r in note_rows {
        let note_id: String = sqlx::Row::try_get(&r, "id").unwrap_or_default();
        let title: String = sqlx::Row::try_get(&r, "title").unwrap_or_default();
        let content: String = sqlx::Row::try_get(&r, "content_html").unwrap_or_default();
        let created_at: String = sqlx::Row::try_get(&r, "created_at").unwrap_or_default();
        let updated_at: String = sqlx::Row::try_get(&r, "updated_at").unwrap_or_default();

        recent_notes.push(FolderNote {
            id: note_id,
            folder_id: id.clone(),
            title: Some(title),
            body_md: content,
            kind: "custom".into(),
            created_at,
            updated_at,
        });
    }

    let continue_learning = None;

    tx.commit().await?;

    Ok(FolderDashboard {
        folder,
        statistics,
        recent_lectures,
        pinned_lectures,
        recent_chats,
        recent_notes,
        continue_learning,
    })
}

#[tauri::command]
pub async fn recompute_folder_statistics(state: State<'_, DbState>, id: String) -> AppResult<FolderStatisticsCache> {
    let mut tx = state.pool.begin().await?;
    
    // Aggregate data for this folder
    let lecture_count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM lectures WHERE folder_id = ?", id)
        .fetch_one(&mut *tx).await?;
        
    let folder_tag_pattern = format!("%\"folder:{}\"%", id);
    let note_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM workspace_notes WHERE tags_json LIKE ?"
    ).bind(&folder_tag_pattern).fetch_one(&mut *tx).await.unwrap_or(0);

    // (Dummy queries for other stats until full schema is known for flashcards/quizzes)
    let flashcard_count: i64 = 0;
    let quiz_count: i64 = 0;
    let storage_bytes: i64 = 0;
    let study_hours: f64 = 0.0;
    let completion_pct: f64 = 0.0;

    let computed_at = Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO folder_statistics_cache 
         (folder_id, lecture_count, study_hours, storage_bytes, flashcard_count, quiz_count, note_count, completion_pct, computed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(folder_id) DO UPDATE SET 
         lecture_count=excluded.lecture_count, study_hours=excluded.study_hours, storage_bytes=excluded.storage_bytes, 
         flashcard_count=excluded.flashcard_count, quiz_count=excluded.quiz_count, note_count=excluded.note_count, 
         completion_pct=excluded.completion_pct, computed_at=excluded.computed_at",
        id, lecture_count, study_hours, storage_bytes, flashcard_count, quiz_count, note_count, completion_pct, computed_at
    ).execute(&mut *tx).await?;

    tx.commit().await?;

    Ok(FolderStatisticsCache {
        folder_id: id,
        lecture_count,
        study_hours,
        storage_bytes,
        flashcard_count,
        quiz_count,
        note_count,
        completion_pct,
        computed_at,
    })
}
