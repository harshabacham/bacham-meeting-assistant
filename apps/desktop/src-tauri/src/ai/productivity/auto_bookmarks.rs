use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AutoBookmark {
    pub id: String,
    pub lecture_id: String,
    pub timestamp_ms: i64,
    pub title: String,
    pub reason: String,
    pub screenshot_path: Option<String>,
    pub category: String, // "exam_warning", "formula", "diagram", "definition", "code"
}

pub struct AutoBookmarkEngine;

impl AutoBookmarkEngine {
    pub fn generate_bookmarks(lecture_id: &str, duration_ms: i64) -> Vec<AutoBookmark> {
        let mut bookmarks = Vec::new();

        if duration_ms > 180_000 {
            bookmarks.push(AutoBookmark {
                id: format!("{}_bm_1", lecture_id),
                lecture_id: lecture_id.to_string(),
                timestamp_ms: 180_000,
                title: "Exam Hint: Key Definition".to_string(),
                reason: "Professor emphasized: 'Remember this definition for exams.'".to_string(),
                screenshot_path: None,
                category: "exam_warning".to_string(),
            });
        }

        if duration_ms > 480_000 {
            bookmarks.push(AutoBookmark {
                id: format!("{}_bm_2", lecture_id),
                lecture_id: lecture_id.to_string(),
                timestamp_ms: 480_000,
                title: "Core Mathematical Formula".to_string(),
                reason: "Formula derivation written on board".to_string(),
                screenshot_path: None,
                category: "formula".to_string(),
            });
        }

        if duration_ms > 900_000 {
            bookmarks.push(AutoBookmark {
                id: format!("{}_bm_3", lecture_id),
                lecture_id: lecture_id.to_string(),
                timestamp_ms: 900_000,
                title: "Architecture Diagram Walkthrough".to_string(),
                reason: "Professor explained high-level system diagram".to_string(),
                screenshot_path: None,
                category: "diagram".to_string(),
            });
        }

        bookmarks
    }
}
