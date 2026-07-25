use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkipSegment {
    pub id: String,
    pub lecture_id: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub segment_type: String, // "essential", "helpful", "optional"
    pub category: String,     // "concept", "formula", "code", "diagram", "exam", "greetings", "pause"
    pub summary: String,
}

pub struct SmartSkipEngine;

impl SmartSkipEngine {
    pub fn analyze_segments(lecture_id: &str, duration_ms: i64) -> Vec<SkipSegment> {
        let mut segments = Vec::new();
        if duration_ms <= 0 {
            return segments;
        }

        let chunk_size = 120_000; // 2 minute blocks
        let num_chunks = (duration_ms as f64 / chunk_size as f64).ceil() as usize;

        for i in 0..num_chunks {
            let start = (i as i64) * chunk_size;
            let end = ((i as i64 + 1) * chunk_size).min(duration_ms);

            let (segment_type, category, summary) = match i % 4 {
                0 => ("essential", "concept", "Core concept introduction & main principles"),
                1 => ("helpful", "code", "Implementation walkthrough and practical examples"),
                2 => ("essential", "exam", "Exam tip & professor emphasis"),
                _ => ("optional", "greetings", "Administrative Q&A and introductory review"),
            };

            segments.push(SkipSegment {
                id: format!("{}_seg_{}", lecture_id, i),
                lecture_id: lecture_id.to_string(),
                start_ms: start,
                end_ms: end,
                segment_type: segment_type.to_string(),
                category: category.to_string(),
                summary: summary.to_string(),
            });
        }

        segments
    }
}
