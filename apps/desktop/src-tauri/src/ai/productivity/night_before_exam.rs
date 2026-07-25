use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExamRevisionTask {
    pub id: String,
    pub title: String,
    pub category: String, // "weak_topic", "formula", "exam_concept", "cheat_sheet"
    pub estimated_minutes: u32,
    pub lecture_id: Option<String>,
    pub timestamp_ms: Option<i64>,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NightBeforeExamPlan {
    pub target_window_minutes: u32,
    pub total_tasks: u32,
    pub total_estimated_minutes: u32,
    pub tasks: Vec<ExamRevisionTask>,
}

pub struct NightBeforeExamEngine;

impl NightBeforeExamEngine {
    pub fn generate_plan(window_minutes: u32) -> NightBeforeExamPlan {
        let mut tasks = Vec::new();

        tasks.push(ExamRevisionTask {
            id: "rev_1".to_string(),
            title: "Review 1-Page Master Cheat Sheet".to_string(),
            category: "cheat_sheet".to_string(),
            estimated_minutes: 10,
            lecture_id: None,
            timestamp_ms: None,
            completed: false,
        });

        tasks.push(ExamRevisionTask {
            id: "rev_2".to_string(),
            title: "Weak Topic: Process Synchronization & Deadlocks".to_string(),
            category: "weak_topic".to_string(),
            estimated_minutes: (window_minutes / 3).max(10),
            lecture_id: None,
            timestamp_ms: None,
            completed: false,
        });

        tasks.push(ExamRevisionTask {
            id: "rev_3".to_string(),
            title: "Essential Formulas & Derivations".to_string(),
            category: "formula".to_string(),
            estimated_minutes: 15,
            lecture_id: None,
            timestamp_ms: None,
            completed: false,
        });

        if window_minutes >= 60 {
            tasks.push(ExamRevisionTask {
                id: "rev_4".to_string(),
                title: "Practice Predicted Exam Questions".to_string(),
                category: "exam_concept".to_string(),
                estimated_minutes: 20,
                lecture_id: None,
                timestamp_ms: None,
                completed: false,
            });
        }

        let total_est: u32 = tasks.iter().map(|t| t.estimated_minutes).sum();

        NightBeforeExamPlan {
            target_window_minutes: window_minutes,
            total_tasks: tasks.len() as u32,
            total_estimated_minutes: total_est,
            tasks,
        }
    }
}
