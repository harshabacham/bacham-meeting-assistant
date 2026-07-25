use tauri::State;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use crate::database::DbState;

#[derive(Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_smart: bool,
    pub smart_rule_json: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct CollectionWithCount {
    #[serde(flatten)]
    pub collection: Collection,
    pub lecture_count: i32,
}

#[derive(Deserialize)]
pub struct CreateCollectionInput {
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_smart: Option<bool>,
    pub smart_rule_json: Option<String>,
}

use uuid::Uuid;
use chrono::Utc;
use sqlx::{QueryBuilder, Sqlite};

#[tauri::command]
pub async fn create_collection(state: State<'_, DbState>, input: CreateCollectionInput) -> AppResult<Collection> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let is_smart = input.is_smart.unwrap_or(false);

    sqlx::query!(
        r#"
        INSERT INTO collections (id, name, color, icon, is_smart, smart_rule_json, sort_order, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?7)
        "#,
        id,
        input.name,
        input.color,
        input.icon,
        is_smart,
        input.smart_rule_json,
        now
    )
    .execute(&state.pool)
    .await?;

    Ok(Collection {
        id,
        name: input.name,
        color: input.color,
        icon: input.icon,
        is_smart,
        smart_rule_json: input.smart_rule_json,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn list_collections(state: State<'_, DbState>) -> AppResult<Vec<CollectionWithCount>> {
    let rows = sqlx::query!(
        r#"
        SELECT 
            c.id as "id!", c.name as "name!", c.color, c.icon, c.is_smart as "is_smart!", c.smart_rule_json, 
            c.sort_order as "sort_order!", c.created_at as "created_at!", c.updated_at as "updated_at!",
            COUNT(cl.lecture_id) as "lecture_count!"
        FROM collections c
        LEFT JOIN collection_lectures cl ON c.id = cl.collection_id
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    let collections = rows.into_iter().map(|row| CollectionWithCount {
        collection: Collection {
            id: row.id,
            name: row.name,
            color: row.color,
            icon: row.icon,
            is_smart: row.is_smart != 0,
            smart_rule_json: row.smart_rule_json,
            sort_order: row.sort_order as i32,
            created_at: row.created_at,
            updated_at: row.updated_at,
        },
        lecture_count: row.lecture_count as i32,
    }).collect();

    Ok(collections)
}

#[tauri::command]
pub async fn add_lectures_to_collection(state: State<'_, DbState>, collection_id: String, lecture_ids: Vec<String>) -> AppResult<()> {
    if lecture_ids.is_empty() {
        return Ok(());
    }

    let now = Utc::now().to_rfc3339();
    let mut tx = state.pool.begin().await?;

    // Use QueryBuilder to batch insert
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new("INSERT OR IGNORE INTO collection_lectures (collection_id, lecture_id, added_at) ");
    
    query_builder.push_values(lecture_ids.iter(), |mut b, id| {
        b.push_bind(collection_id.clone())
         .push_bind(id.clone())
         .push_bind(now.clone());
    });

    query_builder.build().execute(&mut *tx).await?;
    tx.commit().await?;

    Ok(())
}

#[tauri::command]
pub async fn remove_lectures_from_collection(state: State<'_, DbState>, collection_id: String, lecture_ids: Vec<String>) -> AppResult<()> {
    if lecture_ids.is_empty() {
        return Ok(());
    }
    
    let mut tx = state.pool.begin().await?;
    
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new("DELETE FROM collection_lectures WHERE collection_id = ");
    query_builder.push_bind(collection_id);
    query_builder.push(" AND lecture_id IN (");
    
    let mut separated = query_builder.separated(", ");
    for id in lecture_ids.iter() {
        separated.push_bind(id.clone());
    }
    separated.push_unseparated(")");
    
    query_builder.build().execute(&mut *tx).await?;
    tx.commit().await?;

    Ok(())
}

#[tauri::command]
pub async fn remove_lectures_from_all_collections(state: State<'_, DbState>, lecture_ids: Vec<String>) -> AppResult<()> {
    if lecture_ids.is_empty() {
        return Ok(());
    }
    
    let mut tx = state.pool.begin().await?;
    
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new("DELETE FROM collection_lectures WHERE lecture_id IN (");
    
    let mut separated = query_builder.separated(", ");
    for id in lecture_ids.iter() {
        separated.push_bind(id.clone());
    }
    separated.push_unseparated(")");
    
    query_builder.build().execute(&mut *tx).await?;
    tx.commit().await?;

    Ok(())
}

#[tauri::command]
pub async fn delete_collection(state: State<'_, DbState>, id: String) -> AppResult<()> {
    let mut tx = state.pool.begin().await?;
    
    sqlx::query!("DELETE FROM collections WHERE id = ?", id)
        .execute(&mut *tx)
        .await?;
        
    sqlx::query!("DELETE FROM collection_lectures WHERE collection_id = ?", id)
        .execute(&mut *tx)
        .await?;
        
    tx.commit().await?;
    Ok(())
}
