use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::database::DbState;
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub cover_image_path: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub semester: Option<String>,
    pub sort_order: i64,
    pub is_locked: bool,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub trashed_at: Option<String>,
    // Passcode hash is omitted from frontend representation
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderInput {
    pub name: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub cover_image_path: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub semester: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderInput {
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub cover_image_path: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub semester: Option<String>,
}

#[tauri::command]
pub async fn folders_list(state: State<'_, DbState>) -> AppResult<Vec<Folder>> {
    let rows = sqlx::query!(
        "SELECT id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, trashed_at, created_at, updated_at 
         FROM folders ORDER BY sort_order ASC, name ASC"
    ).fetch_all(&state.pool).await?;
    
    let folders = rows.into_iter().map(|r| Folder {
        id: r.id.unwrap_or_default(),
        name: r.name,
        parent_id: r.parent_id,
        color: r.color,
        icon: r.icon,
        cover_image_path: r.cover_image_path,
        description: r.description,
        subject: r.subject,
        semester: r.semester,
        sort_order: r.sort_order,
        is_locked: r.is_locked.unwrap_or(false),
        is_favorite: r.is_favorite == 1,
        is_pinned: r.is_pinned == 1,
        is_archived: r.is_archived == 1,
        trashed_at: r.trashed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }).collect();
    Ok(folders)
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, DbState>, 
    input: CreateFolderInput
) -> AppResult<Folder> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    let mut tx = state.pool.begin().await?;

    if let Some(ref p_id) = input.parent_id {
        // Enforce 1-level nesting rule: Parent must not have a parent
        let parent_parent = sqlx::query!("SELECT parent_id FROM folders WHERE id = ?", p_id)
            .fetch_optional(&mut *tx).await?;
        
        if let Some(pp) = parent_parent {
            if pp.parent_id.is_some() {
                return Err(AppError::Internal("Maximum nesting depth is 1. Cannot nest subfolders.".into()));
            }
        } else {
            return Err(AppError::Internal("Parent folder does not exist.".into()));
        }
    }

    // Default append to end by checking max sort_order
    let max_sort_row = sqlx::query!("SELECT MAX(sort_order) as max_sort FROM folders WHERE parent_id IS ?", input.parent_id)
        .fetch_one(&mut *tx).await?;
    let sort_order = max_sort_row.max_sort.unwrap_or(-1) + 1;

    sqlx::query!(
        "INSERT INTO folders (id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)",
        id, input.name, input.parent_id, input.color, input.icon, input.cover_image_path, input.description, input.subject, input.semester, sort_order, now, now
    ).execute(&mut *tx).await?;

    tx.commit().await?;

    Ok(Folder {
        id,
        name: input.name,
        parent_id: input.parent_id,
        color: input.color,
        icon: input.icon,
        cover_image_path: input.cover_image_path,
        description: input.description,
        subject: input.subject,
        semester: input.semester,
        sort_order,
        is_locked: false,
        is_favorite: false,
        is_pinned: false,
        is_archived: false,
        trashed_at: None,
        created_at: Some(now),
        updated_at: Some(now),
    })
}

#[tauri::command]
pub async fn update_folder(
    state: State<'_, DbState>, 
    id: String, 
    input: UpdateFolderInput
) -> AppResult<Folder> {
    let now = Utc::now().timestamp_millis();
    let mut tx = state.pool.begin().await?;

    if let Some(n) = &input.name {
        sqlx::query!("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", n, now, id).execute(&mut *tx).await?;
    }
    if let Some(c) = &input.color {
        sqlx::query!("UPDATE folders SET color = ?, updated_at = ? WHERE id = ?", c, now, id).execute(&mut *tx).await?;
    }
    if let Some(i) = &input.icon {
        sqlx::query!("UPDATE folders SET icon = ?, updated_at = ? WHERE id = ?", i, now, id).execute(&mut *tx).await?;
    }
    if let Some(c) = &input.cover_image_path {
        sqlx::query!("UPDATE folders SET cover_image_path = ?, updated_at = ? WHERE id = ?", c, now, id).execute(&mut *tx).await?;
    }
    if let Some(d) = &input.description {
        sqlx::query!("UPDATE folders SET description = ?, updated_at = ? WHERE id = ?", d, now, id).execute(&mut *tx).await?;
    }
    if let Some(s) = &input.subject {
        sqlx::query!("UPDATE folders SET subject = ?, updated_at = ? WHERE id = ?", s, now, id).execute(&mut *tx).await?;
    }
    if let Some(s) = &input.semester {
        sqlx::query!("UPDATE folders SET semester = ?, updated_at = ? WHERE id = ?", s, now, id).execute(&mut *tx).await?;
    }
    tx.commit().await?;

    // Fetch the updated folder to return
    let r = sqlx::query!("SELECT id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, trashed_at, created_at, updated_at FROM folders WHERE id = ?", id)
        .fetch_one(&state.pool).await?;

    Ok(Folder {
        id: r.id.unwrap_or_default(),
        name: r.name,
        parent_id: r.parent_id,
        color: r.color,
        icon: r.icon,
        cover_image_path: r.cover_image_path,
        description: r.description,
        subject: r.subject,
        semester: r.semester,
        sort_order: r.sort_order,
        is_locked: r.is_locked.unwrap_or(false),
        is_favorite: r.is_favorite == 1,
        is_pinned: r.is_pinned == 1,
        is_archived: r.is_archived == 1,
        trashed_at: r.trashed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
    })
}

#[tauri::command]
pub async fn rename_folder(state: State<'_, DbState>, id: String, name: String) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    sqlx::query!("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", name, now, id).execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn duplicate_folder(state: State<'_, DbState>, id: String, deep: bool) -> AppResult<Folder> {
    let mut tx = state.pool.begin().await?;
    
    // Fetch source
    let src = sqlx::query!("SELECT * FROM folders WHERE id = ?", id).fetch_one(&mut *tx).await?;
    
    let new_id = Uuid::new_v4().to_string();
    let new_name = format!("{} (Copy)", src.name);
    let now = Utc::now().timestamp_millis();
    
    // Default append to end
    let max_sort_row = sqlx::query!("SELECT MAX(sort_order) as max_sort FROM folders WHERE parent_id IS ?", src.parent_id)
        .fetch_one(&mut *tx).await?;
    let sort_order = max_sort_row.max_sort.unwrap_or(-1) + 1;

    sqlx::query!(
        "INSERT INTO folders (id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        new_id, new_name, src.parent_id, src.color, src.icon, src.cover_image_path, src.description, src.subject, src.semester, sort_order, 
        src.is_locked, src.is_favorite, src.is_pinned, src.is_archived, now, now
    ).execute(&mut *tx).await?;

    if deep {
        // Duplicate folder_notes
        let notes = sqlx::query!("SELECT * FROM folder_notes WHERE folder_id = ?", id).fetch_all(&mut *tx).await?;
        for note in notes {
            let new_note_id = Uuid::new_v4().to_string();
            sqlx::query!(
                "INSERT INTO folder_notes (id, folder_id, title, body_md, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                new_note_id, new_id, note.title, note.body_md, note.kind, note.created_at, note.updated_at
            ).execute(&mut *tx).await?;
        }
    }

    tx.commit().await?;

    let r = sqlx::query!("SELECT id, name, parent_id, color, icon, cover_image_path, description, subject, semester, sort_order, is_locked, is_favorite, is_pinned, is_archived, trashed_at, created_at, updated_at FROM folders WHERE id = ?", new_id)
        .fetch_one(&state.pool).await?;

    Ok(Folder {
        id: r.id.unwrap_or_default(),
        name: r.name,
        parent_id: r.parent_id,
        color: r.color,
        icon: r.icon,
        cover_image_path: r.cover_image_path,
        description: r.description,
        subject: r.subject,
        semester: r.semester,
        sort_order: r.sort_order,
        is_locked: r.is_locked.unwrap_or(false),
        is_favorite: r.is_favorite == 1,
        is_pinned: r.is_pinned == 1,
        is_archived: r.is_archived == 1,
        trashed_at: r.trashed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
    })
}

#[tauri::command]
pub async fn move_folder(state: State<'_, DbState>, id: String, new_parent_id: Option<String>) -> AppResult<()> {
    if new_parent_id.as_ref() == Some(&id) {
        return Err(AppError::Internal("Cannot move a folder into itself".into()));
    }

    let mut tx = state.pool.begin().await?;

    if let Some(ref p_id) = new_parent_id {
        // Enforce 1-level nesting rule
        let parent_parent = sqlx::query!("SELECT parent_id FROM folders WHERE id = ?", p_id)
            .fetch_optional(&mut *tx).await?;
        
        if let Some(pp) = parent_parent {
            if pp.parent_id.is_some() {
                return Err(AppError::Internal("Maximum nesting depth is 1. Cannot move subfolder into another subfolder.".into()));
            }
        } else {
            return Err(AppError::Internal("Parent folder does not exist.".into()));
        }

        // Also check if the folder being moved has children. If it does, and we are moving it into a parent,
        // it would create a 2-level hierarchy!
        let has_children = sqlx::query!("SELECT id FROM folders WHERE parent_id = ? LIMIT 1", id)
            .fetch_optional(&mut *tx).await?;
        
        if has_children.is_some() {
            return Err(AppError::Internal("Cannot nest a folder that already contains subfolders.".into()));
        }
    }

    let now = Utc::now().timestamp_millis();
    
    let max_sort_row = sqlx::query!("SELECT MAX(sort_order) as max_sort FROM folders WHERE parent_id IS ?", new_parent_id)
        .fetch_one(&mut *tx).await?;
    let sort = max_sort_row.max_sort.unwrap_or(-1) + 1;

    sqlx::query!(
        "UPDATE folders SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?", 
        new_parent_id, sort, now, id
    ).execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_folders(state: State<'_, DbState>, parent_id: Option<String>, ordered_ids: Vec<String>) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    let mut tx = state.pool.begin().await?;

    for (index, id) in ordered_ids.iter().enumerate() {
        let sort_val = index as i64;
        sqlx::query!(
            "UPDATE folders SET sort_order = ?, updated_at = ? WHERE id = ? AND parent_id IS ?",
            sort_val, now, id, parent_id
        ).execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn set_folder_favorite(state: State<'_, DbState>, id: String, favorite: bool) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    let val = if favorite { 1 } else { 0 };
    sqlx::query!("UPDATE folders SET is_favorite = ?, updated_at = ? WHERE id = ?", val, now, id).execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_folder_pinned(state: State<'_, DbState>, id: String, pinned: bool) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    let val = if pinned { 1 } else { 0 };
    sqlx::query!("UPDATE folders SET is_pinned = ?, updated_at = ? WHERE id = ?", val, now, id).execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn archive_folder(state: State<'_, DbState>, id: String, archived: bool) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    let val = if archived { 1 } else { 0 };
    sqlx::query!("UPDATE folders SET is_archived = ?, updated_at = ? WHERE id = ?", val, now, id).execute(&state.pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn trash_folder(state: State<'_, DbState>, id: String) -> AppResult<()> {
    let now_str = Utc::now().to_rfc3339();
    let mut tx = state.pool.begin().await?;

    // soft delete; lectures inside become folder_id = NULL (unfiled), NEVER cascade-deleted
    sqlx::query!("UPDATE lectures SET folder_id = NULL WHERE folder_id = ?", id)
        .execute(&mut *tx).await?;

    // Also unfile from any subfolders
    sqlx::query!("UPDATE lectures SET folder_id = NULL WHERE folder_id IN (SELECT id FROM folders WHERE parent_id = ?)", id)
        .execute(&mut *tx).await?;

    // Trash subfolders
    sqlx::query!("UPDATE folders SET trashed_at = ? WHERE parent_id = ?", now_str, id).execute(&mut *tx).await?;

    // Trash folder itself
    sqlx::query!("UPDATE folders SET trashed_at = ? WHERE id = ?", now_str, id).execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn restore_folder(state: State<'_, DbState>, id: String) -> AppResult<()> {
    let mut tx = state.pool.begin().await?;

    // Restore folder itself
    sqlx::query!("UPDATE folders SET trashed_at = NULL WHERE id = ?", id).execute(&mut *tx).await?;

    // Restore subfolders
    sqlx::query!("UPDATE folders SET trashed_at = NULL WHERE parent_id = ?", id).execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_folder_permanently(state: State<'_, DbState>, id: String) -> AppResult<()> {
    let mut tx = state.pool.begin().await?;

    // 1. Delete subfolders
    sqlx::query!("DELETE FROM folders WHERE parent_id = ?", id).execute(&mut *tx).await?;

    // 2. Delete the folder itself
    sqlx::query!("DELETE FROM folders WHERE id = ?", id).execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}

// ======================== Folder Permissions (Lock) ========================

#[tauri::command]
pub async fn lock_folder(state: State<'_, DbState>, id: String, password: String) -> AppResult<()> {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let hash_hex = result.iter().map(|b| format!("{:02x}", b)).collect::<String>();

    let now = Utc::now().timestamp_millis();
    sqlx::query!(
        "UPDATE folders SET is_locked = 1, password_hash = ?, updated_at = ? WHERE id = ?",
        hash_hex, now, id
    ).execute(&state.pool).await?;

    Ok(())
}

#[tauri::command]
pub async fn unlock_folder(state: State<'_, DbState>, id: String, password: String) -> AppResult<bool> {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let hash_hex = result.iter().map(|b| format!("{:02x}", b)).collect::<String>();

    let row = sqlx::query!("SELECT password_hash FROM folders WHERE id = ?", id)
        .fetch_optional(&state.pool).await?;

    if let Some(r) = row {
        if r.password_hash == Some(hash_hex) {
            return Ok(true);
        }
    }

    Ok(false)
}

#[tauri::command]
pub async fn remove_folder_lock(state: State<'_, DbState>, id: String, password: String) -> AppResult<()> {
    let unlocked = unlock_folder(state.clone(), id.clone(), password).await?;
    if !unlocked {
        return Err(AppError::Internal("Invalid password".into()));
    }

    let now = Utc::now().timestamp_millis();
    sqlx::query!(
        "UPDATE folders SET is_locked = 0, password_hash = NULL, updated_at = ? WHERE id = ?",
        now, id
    ).execute(&state.pool).await?;

    Ok(())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderTreeNode {
    pub folder: Folder,
    pub children: Vec<FolderTreeNode>,
}

#[tauri::command]
pub async fn get_folder_tree(state: State<'_, DbState>) -> AppResult<Vec<FolderTreeNode>> {
    let folders = folders_list(state).await?;
    
    // We can't build a tree with recursive references easily in safe Rust without Rc/RefCell or arena.
    // Instead we'll construct the tree manually.
    
    // Since folders_list is small, we can just do a multi-pass approach or use a recursive function.
    fn build_tree(folders: &[Folder], parent_id: Option<&String>) -> Vec<FolderTreeNode> {
        let mut children = Vec::new();
        for folder in folders {
            if folder.parent_id.as_ref() == parent_id {
                let mut node = FolderTreeNode {
                    folder: folder.clone(),
                    children: build_tree(folders, Some(&folder.id)),
                };
                node.children.sort_by(|a, b| a.folder.sort_order.cmp(&b.folder.sort_order));
                children.push(node);
            }
        }
        children.sort_by(|a, b| a.folder.sort_order.cmp(&b.folder.sort_order));
        children
    }
    
    Ok(build_tree(&folders, None))
}
