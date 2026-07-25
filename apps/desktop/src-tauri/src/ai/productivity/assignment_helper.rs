use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentSourceMatch {
    pub question_num: u32,
    pub question_snippet: String,
    pub lecture_id: String,
    pub lecture_title: String,
    pub timestamp_ms: i64,
    pub relevant_concept: String,
    pub suggested_study_order: u32,
}

pub struct AssignmentHelperEngine;

impl AssignmentHelperEngine {
    pub fn match_assignment(text: &str) -> Vec<AssignmentSourceMatch> {
        let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
        let mut matches = Vec::new();

        for (idx, line) in lines.iter().take(5).enumerate() {
            matches.push(AssignmentSourceMatch {
                question_num: (idx + 1) as u32,
                question_snippet: line.chars().take(60).collect(),
                lecture_id: "lec_demo".to_string(),
                lecture_title: "Operating Systems & Concurrency".to_string(),
                timestamp_ms: ((idx + 1) as i64) * 300_000,
                relevant_concept: "Process Synchronization & Mutex".to_string(),
                suggested_study_order: (idx + 1) as u32,
            });
        }

        matches
    }
}
