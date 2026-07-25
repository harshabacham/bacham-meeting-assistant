use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeConcept {
    pub concept_type: String, // 'formula', 'code', 'diagram', 'exam_tip', 'common_mistake', 'definition'
    pub title: String,
    pub description: String,
    pub structured_data: Option<serde_json::Value>,
    pub source_timestamp: Option<i64>,
    pub source_screenshot_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LectureChapter {
    pub title: String,
    pub summary: String,
    pub start_timestamp: i64,
    pub end_timestamp: Option<i64>,
    pub importance: String,
    pub difficulty: String,
    pub concepts_covered: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MultiLevelSummary {
    pub quick_summary: String,
    pub standard_summary: String,
    pub deep_notes: String,
    pub textbook_notes: String,
}
