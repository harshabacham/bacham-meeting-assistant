use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use crate::error::AppResult;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoachSuggestion {
    pub id: String,
    pub title: String,
    pub description: String,
    pub action_type: String, // 'continue' | 'revise' | 'quiz' | 'chat'
    pub lecture_id: Option<String>,
    pub estimated_minutes: u32,
    pub icon: String,
}

pub struct AiStudyCoachEngine;

impl AiStudyCoachEngine {
    pub async fn get_suggestions(pool: &SqlitePool) -> AppResult<Vec<CoachSuggestion>> {
        let mut suggestions = Vec::new();

        // 1. Session memory continue suggestion
        let last_session = sqlx::query(
            "SELECT s.lecture_id, s.video_timestamp_ms, l.title 
             FROM study_sessions s 
             JOIN lectures l ON s.lecture_id = l.id 
             ORDER BY s.updated_at DESC LIMIT 1"
        )
        .fetch_optional(pool)
        .await?;

        if let Some(s) = last_session {
            let lecture_id: String = s.get("lecture_id");
            let title: String = s.get("title");
            let video_timestamp_ms: i64 = s.get("video_timestamp_ms");
            let mins = video_timestamp_ms / 60000;

            suggestions.push(CoachSuggestion {
                id: format!("continue_{}", lecture_id),
                title: format!("Resume '{}'", title),
                description: format!("Picked up right at {mins}m. Restores your exact tab and notes."),
                action_type: "continue".to_string(),
                lecture_id: Some(lecture_id),
                estimated_minutes: 20,
                icon: "play".to_string(),
            });
        }

        // 2. Due Spaced Repetition suggestion
        let due_row = sqlx::query(
            "SELECT COUNT(*) as count FROM spaced_repetition_schedule WHERE next_review_at <= ?"
        )
        .bind(chrono::Utc::now().timestamp_millis())
        .fetch_optional(pool)
        .await?;

        let due_count: i64 = due_row.map(|r| r.get("count")).unwrap_or(0);

        if due_count > 0 {
            suggestions.push(CoachSuggestion {
                id: "due_revision".to_string(),
                title: format!("{due_count} Items Due for Revision"),
                description: "Quick 10-minute spaced repetition session to lock in memory.".to_string(),
                action_type: "revise".to_string(),
                lecture_id: None,
                estimated_minutes: 10,
                icon: "rotate-ccw".to_string(),
            });
        }

        // 3. Weak topic suggestion
        let weak = sqlx::query(
            "SELECT topic_name FROM user_knowledge_profile WHERE mastery_score < 0.6 ORDER BY last_reviewed_at ASC LIMIT 1"
        )
        .fetch_optional(pool)
        .await?;

        if let Some(w) = weak {
            let topic_name: String = w.get("topic_name");
            suggestions.push(CoachSuggestion {
                id: format!("weak_{}", topic_name),
                title: format!("Strengthen {}", topic_name),
                description: "Your quiz score was lower on this topic. Take a 5-minute refresher.".to_string(),
                action_type: "quiz".to_string(),
                lecture_id: None,
                estimated_minutes: 5,
                icon: "zap".to_string(),
            });
        }

        Ok(suggestions)
    }
}
