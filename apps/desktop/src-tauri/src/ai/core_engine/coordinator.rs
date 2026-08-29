use sqlx::SqlitePool;
use crate::error::AppResult;

pub struct CoreEngineCoordinator;

impl CoreEngineCoordinator {
    pub async fn run_full_pipeline(lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
        // 1. Initialize analysis_modules if not exists
        sqlx::query(
            "INSERT OR IGNORE INTO analysis_modules (id, lecture_id) VALUES (?, ?)"
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(lecture_id)
        .execute(pool)
        .await?;

        // Parallel Task: Visual + OCR Analysis
        let visual_task = {
            let pool = pool.clone();
            let lid = lecture_id.to_string();
            tokio::spawn(async move {
                crate::ai::core_engine::visual_analyzer::analyze_visuals(&lid, &pool).await
            })
        };

        // Parallel Task: Audio + Transcript Analysis
        let audio_task = {
            let pool = pool.clone();
            let lid = lecture_id.to_string();
            tokio::spawn(async move {
                crate::ai::core_engine::audio_transcript_analyzer::analyze_audio_transcript(&lid, &pool).await
            })
        };

        // Wait for extraction modules
        let _ = tokio::try_join!(visual_task, audio_task);

        // Run Concept Extractor (depends on visual and audio/transcript)
        crate::ai::core_engine::concept_extractor::extract_concepts(lecture_id, pool).await?;

        // Run Multi-tier Summary Generator & Action Item Extractor in parallel
        let summary_task = {
            let pool = pool.clone();
            let lid = lecture_id.to_string();
            tokio::spawn(async move {
                crate::ai::core_engine::summary_generator::generate_multi_level_summary(&lid, &pool).await
            })
        };

        let action_item_task = {
            let pool = pool.clone();
            let lid = lecture_id.to_string();
            tokio::spawn(async move {
                crate::ai::core_engine::action_item_extractor::extract_action_items(&lid, &pool).await
            })
        };

        let _ = tokio::try_join!(summary_task, action_item_task);

        Ok(())
    }
}
