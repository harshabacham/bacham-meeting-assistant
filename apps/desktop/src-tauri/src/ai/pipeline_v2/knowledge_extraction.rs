use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::AppResult;
use crate::services::gemini_service::GeminiService;
use crate::ai::context_builder::ContextBuilder;
use super::multimodal_perception::MultimodalPerception;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChapterSegment {
    pub title: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub summary: String,
    pub difficulty: String, // 'easy' | 'medium' | 'hard'
    pub importance: f64,    // 0.0 to 1.0
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedNode {
    pub id: String,
    pub node_type: String, // 'concept' | 'definition' | 'formula' | 'code' | 'diagram' | 'graph' | 'question' | 'example' | 'analogy' | 'misconception'
    pub title: String,
    pub start_ms: Option<i64>,
    pub end_ms: Option<i64>,
    pub ocr_text: Option<String>,
    pub transcript_excerpt: Option<String>,
    pub screenshot_id: Option<String>,
    pub confidence: String, // 'high' | 'medium' | 'low'
    pub metadata: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedEdge {
    pub from_node_id: String,
    pub to_node_id: String,
    pub relation: String, // 'prerequisite_of' | 'explains' | 'derives' | 'example_of' | 'contrasts_with'
    pub weight: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedKnowledgePipeline {
    pub chapters: Vec<ChapterSegment>,
    pub nodes: Vec<ExtractedNode>,
    pub edges: Vec<ExtractedEdge>,
}

pub struct KnowledgeExtractor;

impl KnowledgeExtractor {
    pub async fn extract_knowledge(
        lecture_id: &str,
        pool: &SqlitePool,
    ) -> AppResult<ExtractedKnowledgePipeline> {
        // 1. Assemble context
        let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
        let formatted_text = ContextBuilder::format_text_context(&ctx);

        // Deduplicate keyframes
        let dedup_frames = MultimodalPerception::deduplicate_ocr(&ctx.key_frames);

        // 2. Perform visual analysis on keyframes
        let mut visual_results = Vec::new();
        for frame in &dedup_frames {
            if let Ok(res) = MultimodalPerception::analyze_keyframe(frame, lecture_id, pool).await {
                visual_results.push(res);
            }
        }

        // 3. Clean transcript
        let full_transcript = ctx.transcript_segments.iter().map(|s| s.content.as_str()).collect::<Vec<_>>().join("\n");
        let cleaned_txn = MultimodalPerception::analyze_transcript(&full_transcript, pool).await?;

        // 4. Construct unified prompt for Topic Segmentation (Module 9), Extraction (Module 10), and Graph (Module 11)
        let system_instruction = r#"You are the central Knowledge Extraction & Graph Engine of the BACHAM AI pipeline.
Your job is to read the lecture transcript, slide OCR, and visual frame analyses, and produce a unified structured knowledge graph.

Return ONLY valid JSON matching this schema:
{
  "chapters": [
    {
      "title": "Chapter title",
      "start_ms": 0,
      "end_ms": 300000,
      "summary": "Chapter summary",
      "difficulty": "easy" | "medium" | "hard",
      "importance": 0.0 to 1.0
    }
  ],
  "nodes": [
    {
      "node_type": "concept" | "definition" | "formula" | "code" | "diagram" | "graph" | "question" | "example" | "analogy" | "misconception",
      "title": "Title or expression of node",
      "start_ms": 0,
      "end_ms": 300000,
      "ocr_text": "Extracted OCR text if applicable",
      "transcript_excerpt": "Relevant transcript excerpt",
      "confidence": "high" | "medium" | "low",
      "metadata": {
        "formula_derivation": "step-by-step derivation if formula",
        "code_language": "python/cpp if code",
        "diagram_components": ["components if diagram"],
        "graph_trend": "trend explanation if graph"
      }
    }
  ],
  "edges": [
    {
      "from_title": "Title of source node",
      "to_title": "Title of target node",
      "relation": "prerequisite_of" | "explains" | "derives" | "example_of" | "contrasts_with",
      "weight": 1.0
    }
  ]
}

Rules:
1. Extract ALL granular concepts, formulas, code, diagrams, graphs, examples, analogies, questions, and misconceptions.
2. Link them logically with semantic edges.
3. Be highly thorough and accurate. Do not skip math equations, code algorithms, or diagram workflows.
4. Return raw JSON only, no markdown fencing."#;

        let prompt = format!(
            "Lecture Title: {}\nDuration: {}ms\nVisual Analyses: {}\nCleaned Transcript Topics: {:?}\nRaw Context:\n{}",
            ctx.title,
            ctx.duration_ms,
            serde_json::to_string_pretty(&visual_results).unwrap_or_default(),
            cleaned_txn.topics,
            formatted_text
        );

        let mut image_parts = Vec::new();
        for frame in &dedup_frames {
            if let Some(b64) = &frame.image_base64 {
                image_parts.push((b64.clone(), "image/png".to_string()));
            }
        }

        let raw_res = if !image_parts.is_empty() {
            GeminiService::generate_multimodal_with_model(&prompt, system_instruction, &image_parts, pool, "gemini-3.1-flash-lite").await?
        } else {
            GeminiService::generate_text_with_model(&prompt, system_instruction, pool, "gemini-3.1-flash-lite").await?
        };

        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        let parsed: serde_json::Value = serde_json::from_str(clean_res).unwrap_or_else(|_| {
            serde_json::json!({
                "chapters": [],
                "nodes": [],
                "edges": []
            })
        });

        // 5. Store nodes and edges into SQLite
        let now = chrono::Utc::now().timestamp_millis();
        let mut created_nodes = Vec::new();
        let mut title_to_id = std::collections::HashMap::new();

        if let Some(nodes_arr) = parsed["nodes"].as_array() {
            for item in nodes_arr {
                let id = Uuid::new_v4().to_string();
                let title = item["title"].as_str().unwrap_or("Untitled Node").to_string();
                let node_type = item["node_type"].as_str().unwrap_or("concept").to_string();
                let start_ms = item["start_ms"].as_i64();
                let end_ms = item["end_ms"].as_i64();
                let ocr_text = item["ocr_text"].as_str().map(|s| s.to_string());
                let transcript_excerpt = item["transcript_excerpt"].as_str().map(|s| s.to_string());
                let confidence = item["confidence"].as_str().unwrap_or("high").to_string();
                let metadata = item["metadata"].clone();
                let metadata_str = metadata.to_string();

                let _ = sqlx::query(
                    "INSERT INTO knowledge_nodes (id, lecture_id, node_type, title, start_ms, end_ms, ocr_text, transcript_excerpt, confidence, metadata_json, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&id)
                .bind(lecture_id)
                .bind(&node_type)
                .bind(&title)
                .bind(start_ms)
                .bind(end_ms)
                .bind(&ocr_text)
                .bind(&transcript_excerpt)
                .bind(&confidence)
                .bind(&metadata_str)
                .bind(now)
                .execute(pool).await;

                title_to_id.insert(title.clone(), id.clone());
                created_nodes.push(ExtractedNode {
                    id,
                    node_type,
                    title,
                    start_ms,
                    end_ms,
                    ocr_text,
                    transcript_excerpt,
                    screenshot_id: None,
                    confidence,
                    metadata,
                });
            }
        }

        let mut created_edges = Vec::new();
        if let Some(edges_arr) = parsed["edges"].as_array() {
            for item in edges_arr {
                let from_title = item["from_title"].as_str().unwrap_or("");
                let to_title = item["to_title"].as_str().unwrap_or("");
                let relation = item["relation"].as_str().unwrap_or("explains").to_string();
                let weight = item["weight"].as_f64().unwrap_or(1.0);

                if let (Some(from_id), Some(to_id)) = (title_to_id.get(from_title), title_to_id.get(to_title)) {
                    let edge_id = Uuid::new_v4().to_string();
                    let _ = sqlx::query(
                        "INSERT INTO knowledge_edges (id, lecture_id, from_node_id, to_node_id, relation, weight)
                         VALUES (?, ?, ?, ?, ?, ?)"
                    )
                    .bind(&edge_id)
                    .bind(lecture_id)
                    .bind(from_id)
                    .bind(to_id)
                    .bind(&relation)
                    .bind(weight)
                    .execute(pool).await;

                    created_edges.push(ExtractedEdge {
                        from_node_id: from_id.clone(),
                        to_node_id: to_id.clone(),
                        relation,
                        weight,
                    });
                }
            }
        }

        let chapters = parsed["chapters"].as_array().map(|arr| {
            arr.iter().map(|item| ChapterSegment {
                title: item["title"].as_str().unwrap_or("Chapter").to_string(),
                start_ms: item["start_ms"].as_i64().unwrap_or(0),
                end_ms: item["end_ms"].as_i64().unwrap_or(0),
                summary: item["summary"].as_str().unwrap_or("").to_string(),
                difficulty: item["difficulty"].as_str().unwrap_or("medium").to_string(),
                importance: item["importance"].as_f64().unwrap_or(0.5),
            }).collect()
        }).unwrap_or_default();

        Ok(ExtractedKnowledgePipeline {
            chapters,
            nodes: created_nodes,
            edges: created_edges,
        })
    }
}
