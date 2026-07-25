use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use crate::error::AppResult;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TopicInsight {
    pub topic_name: String,
    pub mastery_score: f64,
    pub total_quizzes: i32,
    pub status: String, // 'weak' | 'moderate' | 'strong'
    pub recommendation: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningPlanTask {
    pub task_type: String, // 'continue_lecture' | 'revise_topic' | 'practice_quiz' | 'review_notes'
    pub title: String,
    pub lecture_id: Option<String>,
    pub estimated_minutes: i32,
    pub priority: String, // 'high' | 'medium' | 'low'
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyLearningPlan {
    pub focus_title: String,
    pub total_estimated_minutes: i32,
    pub tasks: Vec<LearningPlanTask>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsSummary {
    pub current_streak_days: i32,
    pub longest_streak_days: i32,
    pub total_hours_studied: f64,
    pub concepts_mastered: i32,
    pub weak_topics: Vec<TopicInsight>,
    pub strong_topics: Vec<TopicInsight>,
}

pub struct LearningAnalyticsEngine;

impl LearningAnalyticsEngine {
    /// Calculate current and longest streak in days.
    pub async fn get_streak_info(pool: &SqlitePool) -> AppResult<(i32, i32, f64)> {
        let rows = sqlx::query(
            "SELECT date_str, duration_ms FROM study_streaks ORDER BY date_str DESC"
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        if rows.is_empty() {
            return Ok((0, 0, 0.0));
        }

        let mut current_streak = 0;
        let mut longest_streak = 0;
        let mut temp_streak = 0;
        let mut total_ms: i64 = 0;

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let yesterday = (chrono::Utc::now() - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();

        let mut last_date: Option<chrono::NaiveDate> = None;

        for r in rows {
            let duration_ms: i64 = r.get("duration_ms");
            let date_str: String = r.get("date_str");
            total_ms += duration_ms;
            if let Ok(d) = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                if let Some(prev) = last_date {
                    if (prev - d).num_days() == 1 {
                        temp_streak += 1;
                    } else {
                        temp_streak = 1;
                    }
                } else {
                    temp_streak = 1;
                    if date_str == today || date_str == yesterday {
                        current_streak = 1;
                    }
                }
                last_date = Some(d);
                if temp_streak > longest_streak {
                    longest_streak = temp_streak;
                }
                if current_streak > 0 && temp_streak > current_streak {
                    current_streak = temp_streak;
                }
            }
        }

        let total_hours = (total_ms as f64) / 3600000.0;
        Ok((current_streak, longest_streak, (total_hours * 10.0).round() / 10.0))
    }

    /// Retrieve Analytics Summary (Weak & Strong topics, Streaks, Hours).
    pub async fn get_summary(pool: &SqlitePool) -> AppResult<AnalyticsSummary> {
        let (current_streak, longest_streak, total_hours) = Self::get_streak_info(pool).await?;

        let profile_rows = sqlx::query(
            "SELECT topic_name, mastery_score, total_quizzes FROM user_knowledge_profile ORDER BY mastery_score ASC"
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        let mut weak_topics = Vec::new();
        let mut strong_topics = Vec::new();
        let mut concepts_mastered = 0;

        for p in profile_rows {
            let topic_name: String = p.get("topic_name");
            let mastery_score: f64 = p.get("mastery_score");
            let total_quizzes: i64 = p.get("total_quizzes");

            let status = if mastery_score < 0.6 {
                "weak"
            } else if mastery_score >= 0.85 {
                concepts_mastered += 1;
                "strong"
            } else {
                "moderate"
            };

            let recommendation = match status {
                "weak" => format!("Targeted 15-min revision recommended for {}", topic_name),
                "strong" => format!("Mastered! Challenge yourself with advanced interview problems on {}", topic_name),
                _ => format!("Good progress on {}. Review again in 3 days", topic_name),
            };

            let insight = TopicInsight {
                topic_name: topic_name.clone(),
                mastery_score,
                total_quizzes: total_quizzes as i32,
                status: status.to_string(),
                recommendation,
            };

            if status == "weak" {
                weak_topics.push(insight);
            } else if status == "strong" {
                strong_topics.push(insight);
            }
        }

        Ok(AnalyticsSummary {
            current_streak_days: current_streak,
            longest_streak_days: longest_streak,
            total_hours_studied: total_hours,
            concepts_mastered,
            weak_topics,
            strong_topics,
        })
    }

    /// Generate Daily Learning Plan ("Today's Focus").
    pub async fn get_daily_plan(pool: &SqlitePool) -> AppResult<DailyLearningPlan> {
        let mut tasks = Vec::new();

        // 1. Most recently opened lecture
        let last_lec = sqlx::query(
            "SELECT l.id, l.title, s.video_timestamp_ms 
             FROM study_sessions s 
             JOIN lectures l ON s.lecture_id = l.id 
             ORDER BY s.updated_at DESC LIMIT 1"
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

        if let Some(lec) = last_lec {
            let title: String = lec.get("title");
            let id: String = lec.get("id");
            let mins_left = 25; // Estimated duration
            tasks.push(LearningPlanTask {
                task_type: "continue_lecture".to_string(),
                title: format!("Continue '{}'", title),
                lecture_id: Some(id),
                estimated_minutes: mins_left,
                priority: "high".to_string(),
            });
        }

        // 2. Weak topics revision task
        let weak_row = sqlx::query(
            "SELECT topic_name FROM user_knowledge_profile WHERE mastery_score < 0.6 ORDER BY last_reviewed_at ASC LIMIT 1"
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

        if let Some(w) = weak_row {
            let topic_name: String = w.get("topic_name");
            tasks.push(LearningPlanTask {
                task_type: "revise_topic".to_string(),
                title: format!("Revise Weak Topic: {}", topic_name),
                lecture_id: None,
                estimated_minutes: 15,
                priority: "high".to_string(),
            });
        } else {
            tasks.push(LearningPlanTask {
                task_type: "practice_quiz".to_string(),
                title: "Practice 5-min Spaced Repetition Quiz".to_string(),
                lecture_id: None,
                estimated_minutes: 10,
                priority: "medium".to_string(),
            });
        }

        let total_est: i32 = tasks.iter().map(|t| t.estimated_minutes).sum();

        Ok(DailyLearningPlan {
            focus_title: "Today's Focus".to_string(),
            total_estimated_minutes: total_est,
            tasks,
        })
    }
}
