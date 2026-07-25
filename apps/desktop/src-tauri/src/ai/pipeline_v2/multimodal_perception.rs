use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use crate::error::AppResult;
use crate::services::gemini_service::GeminiService;
use crate::ai::context_builder::KeyFrame;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VisualAnalysisResult {
    pub id: String,
    pub screenshot_id: String,
    pub lecture_id: String,
    pub visual_type: String, // 'diagram' | 'formula' | 'code' | 'graph' | 'flowchart' | 'ui' | 'whiteboard' | 'general'
    pub domain: String,      // 'programming' | 'math' | 'physics' | 'chemistry' | 'biology' | 'general'
    pub description: String,
    pub purpose: Option<String>,
    pub importance_score: f64,
    pub structured_details: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CleanedTranscript {
    pub topics: Vec<String>,
    pub definitions: Vec<String>,
    pub terminology: Vec<String>,
    pub cleaned_text: String,
}

pub struct MultimodalPerception;

impl MultimodalPerception {
    /// Deduplicate OCR text across contiguous keyframes to prevent redundant Gemini processing.
    pub fn deduplicate_ocr(frames: &[KeyFrame]) -> Vec<KeyFrame> {
        let mut unique_frames: Vec<KeyFrame> = Vec::new();
        let mut last_ocr: Option<String> = None;

        for frame in frames {
            let current_ocr = frame.ocr_text.as_deref().unwrap_or("").trim().to_lowercase();
            if current_ocr.is_empty() {
                unique_frames.push(frame.clone());
                continue;
            }

            if let Some(prev) = &last_ocr {
                // If OCR is >80% similar to previous frame, skip duplicate
                let similarity = simsearch_simple(prev, &current_ocr);
                if similarity > 0.85 {
                    continue;
                }
            }

            last_ocr = Some(current_ocr);
            unique_frames.push(frame.clone());
        }

        unique_frames
    }

    /// Process Visual Perception (Modules 1, 3, 4, 5, 6, 7, 8) for keyframes.
    pub async fn analyze_keyframe(
        frame: &KeyFrame,
        lecture_id: &str,
        pool: &SqlitePool,
    ) -> AppResult<VisualAnalysisResult> {
        // Check database cache first
        let existing = sqlx::query(
            "SELECT id, visual_type, domain, description, purpose, importance_score, structured_details_json 
             FROM visual_analyses WHERE screenshot_id = ?"
        )
        .bind(&frame.screenshot_id)
        .fetch_optional(pool)
        .await?;

        if let Some(row) = existing {
            let details_str: String = row.get("structured_details_json");
            let details: serde_json::Value = serde_json::from_str(&details_str).unwrap_or_else(|_| serde_json::json!({}));
            return Ok(VisualAnalysisResult {
                id: row.get("id"),
                screenshot_id: frame.screenshot_id.clone(),
                lecture_id: lecture_id.to_string(),
                visual_type: row.get("visual_type"),
                domain: row.get::<Option<String>, _>("domain").unwrap_or_else(|| "general".to_string()),
                description: row.get("description"),
                purpose: row.get("purpose"),
                importance_score: row.get("importance_score"),
                structured_details: details,
            });
        }

        // Multimodal analysis with Gemini Flash Lite
        let system_instruction = r#"You are an expert visual perceptual engine for educational lectures.
Analyze the provided slide/frame screenshot and OCR text.
Return ONLY valid JSON matching this schema:
{
  "visual_type": "diagram" | "formula" | "code" | "graph" | "flowchart" | "ui" | "whiteboard" | "general",
  "domain": "programming" | "math" | "physics" | "chemistry" | "biology" | "general",
  "description": "Clear overview of what is shown visually",
  "purpose": "Why this slide is shown and how it contributes to the topic",
  "importance_score": 0.0 to 1.0,
  "structured_details": {
    "language": "python/cpp/java/etc if code",
    "complexity": "O(N) or explanation if code",
    "equations": ["equations found if math/physics"],
    "units_variables": ["symbol meanings"],
    "graph_trends": "axes and trend explanation if graph",
    "diagram_components": ["component names and workflow if diagram/flowchart"]
  }
}
Rules:
1. Identify exact visual_type and domain.
2. Be extremely thorough with code syntax, math derivations, and diagram relationships.
3. No markdown fencing (```json), return raw JSON only."#;

        let ocr_context = frame.ocr_text.as_deref().unwrap_or("None");
        let prompt = format!("Timestamp: {}ms\nOCR Text:\n{}", frame.captured_at, ocr_context);

        let mut image_parts = Vec::new();
        if let Some(b64) = &frame.image_base64 {
            image_parts.push((b64.clone(), "image/png".to_string()));
        }

        let raw_res = if !image_parts.is_empty() {
            GeminiService::generate_multimodal_with_model(&prompt, system_instruction, &image_parts, pool, "gemini-3.1-flash-lite").await?
        } else {
            GeminiService::generate_text_with_model(&prompt, system_instruction, pool, "gemini-3.1-flash-lite").await?
        };

        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        let parsed: serde_json::Value = serde_json::from_str(clean_res).unwrap_or_else(|_| {
            serde_json::json!({
                "visual_type": "general",
                "domain": "general",
                "description": ocr_context,
                "purpose": "Lecture slide context",
                "importance_score": 0.5,
                "structured_details": {}
            })
        });

        let id = Uuid::new_v4().to_string();
        let visual_type = parsed["visual_type"].as_str().unwrap_or("general").to_string();
        let domain = parsed["domain"].as_str().unwrap_or("general").to_string();
        let description = parsed["description"].as_str().unwrap_or(ocr_context).to_string();
        let purpose = parsed["purpose"].as_str().map(|s| s.to_string());
        let importance_score = parsed["importance_score"].as_f64().unwrap_or(0.5);
        let details_json = parsed["structured_details"].to_string();

        let _ = sqlx::query(
            "INSERT INTO visual_analyses (id, screenshot_id, lecture_id, visual_type, domain, description, purpose, importance_score, structured_details_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&frame.screenshot_id)
        .bind(lecture_id)
        .bind(&visual_type)
        .bind(&domain)
        .bind(&description)
        .bind(&purpose)
        .bind(importance_score)
        .bind(&details_json)
        .execute(pool).await;

        Ok(VisualAnalysisResult {
            id,
            screenshot_id: frame.screenshot_id.clone(),
            lecture_id: lecture_id.to_string(),
            visual_type,
            domain,
            description,
            purpose,
            importance_score,
            structured_details: parsed["structured_details"].clone(),
        })
    }

    /// Process Audio/Transcript Analysis (Module 2).
    pub async fn analyze_transcript(
        transcript: &str,
        pool: &SqlitePool,
    ) -> AppResult<CleanedTranscript> {
        if transcript.trim().is_empty() {
            return Ok(CleanedTranscript {
                topics: vec![],
                definitions: vec![],
                terminology: vec![],
                cleaned_text: "".to_string(),
            });
        }

        let system_instruction = r#"You are a transcript analysis module for university lectures.
Extract structured knowledge and filter out noise (filler words, greetings, class logistics, unrelated banter).
Return ONLY valid JSON matching this schema:
{
  "topics": ["main topics covered"],
  "definitions": ["explicit definitions stated"],
  "terminology": ["key technical terms introduced"],
  "cleaned_text": "Cleaned, polished transcript preserving all educational explanations, formulas, code mentions, and student questions."
}"#;

        let raw_res = GeminiService::generate_text_with_model(transcript, system_instruction, pool, "gemini-3.1-flash-lite").await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        let parsed: serde_json::Value = serde_json::from_str(clean_res).unwrap_or_else(|_| {
            serde_json::json!({
                "topics": [],
                "definitions": [],
                "terminology": [],
                "cleaned_text": transcript
            })
        });

        Ok(CleanedTranscript {
            topics: parsed["topics"].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default(),
            definitions: parsed["definitions"].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default(),
            terminology: parsed["terminology"].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default(),
            cleaned_text: parsed["cleaned_text"].as_str().unwrap_or(transcript).to_string(),
        })
    }
}

fn simsearch_simple(a: &str, b: &str) -> f64 {
    if a.is_empty() || b.is_empty() { return 0.0; }
    let set_a: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let set_b: std::collections::HashSet<&str> = b.split_whitespace().collect();
    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    if union == 0 { 0.0 } else { intersection as f64 / union as f64 }
}
