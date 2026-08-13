use crate::error::AppResult;
use sqlx::SqlitePool;
use super::models::{SectionDraftJob, NodeType};
use crate::services::gemini_service::GeminiService;

pub async fn draft_section(job: &SectionDraftJob, pool: &SqlitePool) -> AppResult<String> {
    if job.context_nodes.is_empty() {
        return Ok(String::new());
    }

    let has_complex_nodes = job.context_nodes.iter().any(|n| 
        matches!(n.node_type, NodeType::Formula | NodeType::Code)
    );

    let model = if has_complex_nodes {
        "gemini-2.0-flash-lite"
    } else {
        "gemini-2.0-flash-lite"
    };

    let system_instruction = "You are a university professor drafting a section of a textbook based on lecture notes.
You will receive a list of Knowledge Nodes for this section. Your job is to synthesize them into beautiful, clear markdown.
Follow the rules:
1. Explain every concept. Don't just list them. Teach.
2. If there are formulas, explain the derivation, variables, and common mistakes.
3. If there is code, explain the logic, flow, and edge cases.
4. If there are tables/diagrams, describe them or output a markdown table.
5. Use visual callouts: 💡 Key Idea, ⚠ Common Mistake, 🎯 Exam Tip, 🧠 Remember, 📖 Definition, 💻 Code, 🧮 Formula. (Max 1 per concept).
6. Do NOT invent facts. If something is missing, say 'not clearly visible'.";

    let context_json = serde_json::to_string_pretty(&job.context_nodes).unwrap_or_default();
    let prompt = format!("Segment Title: {:?}\n\nNodes:\n{}", job.segment.title, context_json);

    let res = GeminiService::generate_text_with_model(&prompt, system_instruction, pool, model).await?;
    
    // Fallback if Pro fails or isn't available: usually handled inside generate_text, but we just return res
    Ok(res)
}

pub fn assemble_markdown(drafts: &[String]) -> String {
    let mut final_markdown = String::new();
    for draft in drafts {
        if !draft.trim().is_empty() {
            final_markdown.push_str(draft.trim());
            final_markdown.push_str("\n\n---\n\n");
        }
    }
    final_markdown
}
