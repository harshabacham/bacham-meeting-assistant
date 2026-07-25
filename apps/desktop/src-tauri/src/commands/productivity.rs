use crate::error::AppResult;
use crate::ai::productivity::{
    SmartSkipEngine, SkipSegment, AutoBookmarkEngine, AutoBookmark,
    NightBeforeExamEngine, NightBeforeExamPlan, ExamPredictorEngine, PredictedExamQuestion,
    AssignmentHelperEngine, AssignmentSourceMatch
};
use serde::{Deserialize, Serialize};

#[tauri::command]
pub async fn get_lecture_skip_segments(lecture_id: String, duration_ms: i64) -> AppResult<Vec<SkipSegment>> {
    Ok(SmartSkipEngine::analyze_segments(&lecture_id, duration_ms))
}

#[tauri::command]
pub async fn get_auto_bookmarks(lecture_id: String, duration_ms: i64) -> AppResult<Vec<AutoBookmark>> {
    Ok(AutoBookmarkEngine::generate_bookmarks(&lecture_id, duration_ms))
}

#[tauri::command]
pub async fn generate_night_before_plan(window_minutes: u32) -> AppResult<NightBeforeExamPlan> {
    Ok(NightBeforeExamEngine::generate_plan(window_minutes))
}

#[tauri::command]
pub async fn predict_exam_questions(lecture_id: String) -> AppResult<Vec<PredictedExamQuestion>> {
    Ok(ExamPredictorEngine::predict_questions(&lecture_id))
}

#[tauri::command]
pub async fn match_assignment_helper(assignment_text: String) -> AppResult<Vec<AssignmentSourceMatch>> {
    Ok(AssignmentHelperEngine::match_assignment(&assignment_text))
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnePageCheatSheetData {
    pub title: String,
    pub key_definitions: Vec<String>,
    pub essential_formulas: Vec<String>,
    pub common_mistakes: Vec<String>,
    pub exam_tips: Vec<String>,
}

#[tauri::command]
pub async fn generate_one_page_cheat_sheet(_lecture_id: String) -> AppResult<OnePageCheatSheetData> {
    Ok(OnePageCheatSheetData {
        title: "Master Operating Systems & Concurrency Cheat Sheet".to_string(),
        key_definitions: vec![
            "Process: Program in execution with isolated memory space.".to_string(),
            "Thread: Lightweight unit of CPU execution sharing process memory.".to_string(),
            "Deadlock: Mutual blocking of threads waiting for unheld resources.".to_string(),
        ],
        essential_formulas: vec![
            "CPU Utilization = 1 - (p^n) where p = I/O wait fraction.".to_string(),
            "Banker's Algorithm: Need[i,j] = Max[i,j] - Allocation[i,j].".to_string(),
        ],
        common_mistakes: vec![
            "Forgetting to release mutex lock on early return paths.".to_string(),
            "Confusing race conditions with deadlock states.".to_string(),
        ],
        exam_tips: vec![
            "Always state mutual exclusion as condition #1 for deadlocks.".to_string(),
            "Draw Resource Allocation Graph (RAG) cycles to prove deadlock.".to_string(),
        ],
    })
}
