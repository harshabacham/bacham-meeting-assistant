use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;
use super::models::{KnowledgeGraph, SectionDraftJob, KnowledgeSegment};

pub async fn segment_graph(graph: &mut KnowledgeGraph, pool: &SqlitePool) -> AppResult<Vec<SectionDraftJob>> {
    if graph.nodes.is_empty() {
        return Ok(vec![]);
    }

    let system_instruction = "You are a Semantic Segmentation engine for a university lecture.
Your task is to divide a list of Knowledge Nodes into logical segments (e.g., Intro, Topic 1, Example, Problem Solving, Conclusion).
Output a JSON array of segments.

Schema:
[
  {
    \"segment_type\": \"intro\" | \"topic\" | \"example\" | \"practice\" | \"question\" | \"revision\" | \"conclusion\",
    \"node_ids\": [\"node_1\", \"node_2\"],
    \"order\": 1,
    \"title\": \"Segment Title\"
  }
]

Rules:
1. Every node MUST belong to exactly one segment.
2. Group nodes logically by time and semantic relationship.
3. Keep segments focused. A segment should not be too long.
4. Output MUST be a valid JSON array.";

    let nodes_json = serde_json::to_string_pretty(&graph.nodes).unwrap_or_default();
    let prompt = format!("Nodes:\n{}", nodes_json);

    let res = crate::services::universal_ai::UniversalAiService::generate_text(&prompt, system_instruction, pool).await?;
    let res = res.replace("```json", "").replace("```", "");

    let segments: Vec<KnowledgeSegment> = serde_json::from_str(&res)
        .map_err(|e| AppError::Internal(format!("Failed to parse segments JSON: {e}\nResponse: {res}")))?;

    graph.segments = segments.clone();

    let mut jobs = Vec::new();
    for (i, segment) in segments.iter().enumerate() {
        let prev_title = if i > 0 { segments[i - 1].title.clone() } else { None };
        let next_title = if i < segments.len() - 1 { segments[i + 1].title.clone() } else { None };

        let context_nodes: Vec<_> = graph.nodes.iter()
            .filter(|n| segment.node_ids.contains(&n.id))
            .cloned()
            .collect();

        jobs.push(SectionDraftJob {
            segment: segment.clone(),
            context_nodes,
            previous_segment_title: prev_title,
            next_segment_title: next_title,
        });
    }

    Ok(jobs)
}
