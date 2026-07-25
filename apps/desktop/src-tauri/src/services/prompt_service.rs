use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;
use serde::{Serialize, Deserialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedPrompt {
    pub id: String,
    pub name: String,
    pub body: String,
    pub category: Option<String>,
    pub is_favorite: bool,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

pub struct PromptService;

impl PromptService {
    pub async fn list_prompts(pool: &SqlitePool) -> AppResult<Vec<SavedPrompt>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, name, body, category, is_favorite, is_builtin, created_at, updated_at
            FROM saved_prompts
            ORDER BY is_builtin DESC, name ASC
            "#
        )
        .fetch_all(pool)
        .await?;

        let prompts = rows.into_iter().map(|r| SavedPrompt {
            id: r.id.unwrap_or_default(),
            name: r.name,
            body: r.body,
            category: r.category,
            is_favorite: r.is_favorite != 0,
            is_builtin: r.is_builtin != 0,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }).collect();

        Ok(prompts)
    }

    pub async fn create_prompt(
        pool: &SqlitePool,
        name: &str,
        body: &str,
        category: Option<&str>,
    ) -> AppResult<SavedPrompt> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO saved_prompts (id, name, body, category, is_favorite, is_builtin, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?5)
            "#,
            id,
            name,
            body,
            category,
            now
        )
        .execute(pool)
        .await?;

        Ok(SavedPrompt {
            id,
            name: name.to_string(),
            body: body.to_string(),
            category: category.map(|s| s.to_string()),
            is_favorite: false,
            is_builtin: false,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub async fn update_prompt(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        body: Option<&str>,
        category: Option<&str>,
    ) -> AppResult<()> {
        let now = Utc::now().to_rfc3339();

        let mut query = sqlx::QueryBuilder::new("UPDATE saved_prompts SET updated_at = ");
        query.push_bind(&now);

        if let Some(n) = name {
            query.push(", name = ");
            query.push_bind(n);
        }
        if let Some(b) = body {
            query.push(", body = ");
            query.push_bind(b);
        }
        if let Some(c) = category {
            query.push(", category = ");
            query.push_bind(c);
        }

        query.push(" WHERE id = ");
        query.push_bind(id);
        query.push(" AND is_builtin = 0"); // Prevent editing builtin prompts

        let result = query.build().execute(pool).await?;
        if result.rows_affected() == 0 {
            return Err(AppError::Internal("Prompt not found or is read-only".to_string()));
        }

        Ok(())
    }

    pub async fn toggle_favorite(pool: &SqlitePool, id: &str, favorite: bool) -> AppResult<()> {
        let fav_int = if favorite { 1 } else { 0 };
        let now = Utc::now().to_rfc3339();
        
        let result = sqlx::query!(
            "UPDATE saved_prompts SET is_favorite = ?1, updated_at = ?2 WHERE id = ?3",
            fav_int,
            now,
            id
        )
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::Internal("Prompt not found".to_string()));
        }

        Ok(())
    }

    pub async fn delete_prompt(pool: &SqlitePool, id: &str) -> AppResult<()> {
        let result = sqlx::query!(
            "DELETE FROM saved_prompts WHERE id = ?1 AND is_builtin = 0",
            id
        )
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::Internal("Prompt not found or is read-only".to_string()));
        }

        Ok(())
    }
}
