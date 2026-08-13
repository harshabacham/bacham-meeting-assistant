use crate::error::AppResult;
use sqlx::SqlitePool;
use super::models::KnowledgeGraph;

pub async fn verify_markdown(markdown: &str, graph: &KnowledgeGraph, pool: &SqlitePool) -> AppResult<String> {
    if markdown.is_empty() {
        return Ok(String::new());
    }

    let system_instruction = "You are a factual verification agent. 
You will be given a drafted summary and a Knowledge Graph (list of facts).
Your job is to read the summary and flag any factual claims that CANNOT be found in the Knowledge Graph.
If a claim is not supported, append \" (not clearly visible)\" next to it in the text.
Do NOT rewrite the whole text, just insert the flag where necessary.
Output the verified markdown text directly.";

    let nodes_json = serde_json::to_string_pretty(&graph.nodes).unwrap_or_default();
    let prompt = format!("Knowledge Graph:\n{}\n\nSummary Draft:\n{}", nodes_json, markdown);

    let res = crate::services::universal_ai::UniversalAiService::generate_text(&prompt, system_instruction, pool).await?;
    
    Ok(res)
}
