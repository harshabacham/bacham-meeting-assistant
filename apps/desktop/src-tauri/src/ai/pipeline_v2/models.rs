use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    Concept,
    Formula,
    Code,
    Diagram,
    Graph,
    Table,
    Example,
    Question,
    Unknown,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeNode {
    pub id: String,
    pub node_type: NodeType,
    pub timestamp_range: (i64, i64),
    pub title: String,
    pub ocr_text: Option<String>,
    pub transcript_excerpt: Option<String>,
    pub screenshot_ref: Option<String>,
    pub confidence: String, // "high", "medium", "low"
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeEdge {
    pub from: String,
    pub to: String,
    pub relation: String, // "explains", "precedes", "example_of", "contrasts_with"
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeSegment {
    pub segment_type: String, // "intro", "topic", "example", "practice", "question", "revision", "conclusion"
    pub node_ids: Vec<String>,
    pub order: i32,
    pub title: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeGraph {
    pub lecture_id: String,
    pub nodes: Vec<KnowledgeNode>,
    pub edges: Vec<KnowledgeEdge>,
    pub segments: Vec<KnowledgeSegment>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SectionDraftJob {
    pub segment: KnowledgeSegment,
    pub context_nodes: Vec<KnowledgeNode>,
    pub previous_segment_title: Option<String>,
    pub next_segment_title: Option<String>,
}
