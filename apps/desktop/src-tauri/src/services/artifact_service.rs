use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LectureArtifact {
    pub id: String,
    pub lecture_id: String,
    pub artifact_type: String,
    pub content_json: String,
    pub generated_at: i64,
    pub model_used: String,
    pub version: i64,
    pub status: String,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactMeta {
    pub artifact_type: String,
    pub version: i64,
    pub generated_at: i64,
    pub status: String,
}

pub struct ArtifactService;

impl ArtifactService {
    /// Get the latest artifact of a given type for a lecture.
    pub async fn get_latest(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
    ) -> AppResult<Option<LectureArtifact>> {
        let row = sqlx::query!(
            "SELECT id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status \
             FROM lecture_artifacts \
             WHERE lecture_id = ? AND artifact_type = ? AND status = 'done' \
             ORDER BY version DESC LIMIT 1",
            lecture_id, artifact_type
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| LectureArtifact {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id,
            artifact_type: r.artifact_type,
            content_json: r.content_json,
            generated_at: r.generated_at,
            model_used: r.model_used,
            version: r.version,
            status: r.status,
        }))
    }

    /// List latest status of all artifact types for a lecture.
    pub async fn list_for_lecture(
        pool: &SqlitePool,
        lecture_id: &str,
    ) -> AppResult<Vec<ArtifactMeta>> {
        let rows = sqlx::query!(
            r#"SELECT artifact_type, MAX(version) as "version: i64", MAX(generated_at) as "generated_at: i64", status 
             FROM lecture_artifacts 
             WHERE lecture_id = ? 
             GROUP BY artifact_type 
             ORDER BY artifact_type"#,
            lecture_id
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|r| ArtifactMeta {
            artifact_type: r.artifact_type,
            version: r.version.unwrap_or(1),
            generated_at: r.generated_at.unwrap_or(0),
            status: r.status,
        }).collect())
    }

    /// Get all versions of an artifact (for version history).
    pub async fn get_versions(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
    ) -> AppResult<Vec<LectureArtifact>> {
        let rows = sqlx::query!(
            "SELECT id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status \
             FROM lecture_artifacts \
             WHERE lecture_id = ? AND artifact_type = ? \
             ORDER BY version DESC",
            lecture_id, artifact_type
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|r| LectureArtifact {
            id: r.id.unwrap_or_default(),
            lecture_id: r.lecture_id,
            artifact_type: r.artifact_type,
            content_json: r.content_json,
            generated_at: r.generated_at,
            model_used: r.model_used,
            version: r.version,
            status: r.status,
        }).collect())
    }

    /// Insert a pending artifact placeholder (used during generation).
    pub async fn insert_pending(
        pool: &SqlitePool,
        lecture_id: &str,
        artifact_type: &str,
    ) -> AppResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        sqlx::query!(
            "INSERT OR IGNORE INTO lecture_artifacts \
             (id, lecture_id, artifact_type, content_json, generated_at, model_used, version, status) \
             VALUES (?, ?, ?, '{}', ?, 'gemini-2.0-flash-lite', 1, 'pending')",
            id, lecture_id, artifact_type, now
        )
        .execute(pool)
        .await?;
        Ok(id)
    }
}
