use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PredictedExamQuestion {
    pub id: String,
    pub lecture_id: String,
    pub question: String,
    pub likelihood: String, // "very_likely", "likely", "possible"
    pub explanation: String,
    pub references: Vec<String>,
}

pub struct ExamPredictorEngine;

impl ExamPredictorEngine {
    pub fn predict_questions(lecture_id: &str) -> Vec<PredictedExamQuestion> {
        vec![
            PredictedExamQuestion {
                id: format!("{}_eq_1", lecture_id),
                lecture_id: lecture_id.to_string(),
                question: "Explain the necessary conditions for a Deadlock to occur in an Operating System.".to_string(),
                likelihood: "very_likely".to_string(),
                explanation: "Professor repeated mutual exclusion and hold-and-wait 4 times and explicitly stated 'this will be on the midterm'".to_string(),
                references: vec!["14:20 - Deadlock Conditions".to_string()],
            },
            PredictedExamQuestion {
                id: format!("{}_eq_2", lecture_id),
                lecture_id: lecture_id.to_string(),
                question: "Compare and contrast Semaphores vs Mutex locks with code examples.".to_string(),
                likelihood: "likely".to_string(),
                explanation: "Covered in depth during code walkthrough with 2 dedicated keyframe slides.".to_string(),
                references: vec!["28:10 - Semaphore Implementation".to_string()],
            },
        ]
    }
}
