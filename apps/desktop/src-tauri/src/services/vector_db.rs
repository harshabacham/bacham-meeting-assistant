use crate::error::AppResult;
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VectorChunk {
    pub id: String,
    pub lecture_id: String,
    pub chunk_text: String,
    pub embedding: Vec<f32>,
}

pub struct VectorDb {
    pool: SqlitePool,
}

impl VectorDb {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn init_tables(&self) -> AppResult<()> {
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS vector_chunks (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                embedding_json TEXT NOT NULL
            )"
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn insert_chunk(&self, lecture_id: &str, chunk_text: &str, embedding: Vec<f32>) -> AppResult<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let embedding_json = serde_json::to_string(&embedding).unwrap();
        
        sqlx::query(
            "INSERT INTO vector_chunks (id, lecture_id, chunk_text, embedding_json) VALUES (?, ?, ?, ?)"
        )
        .bind(id)
        .bind(lecture_id)
        .bind(chunk_text)
        .bind(embedding_json)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn search(&self, query_embedding: &[f32], limit: usize) -> AppResult<Vec<(String, f32)>> {
        // Fetch all chunks from DB (in-memory brute-force cosine similarity)
        // This is perfectly fine for <100,000 chunks in Rust.
        let rows = sqlx::query(
            "SELECT chunk_text, embedding_json FROM vector_chunks"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut results: Vec<(String, f32)> = Vec::new();

        use sqlx::Row;
        for row in rows {
            let chunk_text: String = row.get("chunk_text");
            let embedding_json: String = row.get("embedding_json");
            if let Ok(emb) = serde_json::from_str::<Vec<f32>>(&embedding_json) {
                if emb.len() == query_embedding.len() {
                    let score = Self::cosine_similarity(&query_embedding, &emb);
                    results.push((chunk_text, score));
                }
            }
        }

        // Sort by highest score first
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        Ok(results)
    }

    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm_a == 0.0 || norm_b == 0.0 {
            0.0
        } else {
            dot_product / (norm_a * norm_b)
        }
    }
}
