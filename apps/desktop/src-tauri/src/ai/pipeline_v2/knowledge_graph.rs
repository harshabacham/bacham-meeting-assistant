use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;
use super::models::KnowledgeGraph;
use crate::ai::context_builder::ContextBuilder;
use crate::services::gemini_service::GeminiService;

pub async fn build_graph(lecture_id: &str, pool: &SqlitePool) -> AppResult<KnowledgeGraph> {
    // 1. Fetch raw signals locally (SET load_images = true)
    let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
    let raw_text = ContextBuilder::format_text_context(&ctx);

    if ctx.is_empty() {
        return Err(AppError::Internal("No visual or audio context found to build knowledge graph.".to_string()));
    }

    // 2. Call Flash to build the KnowledgeGraph
    let system_instruction = "You are a Knowledge Graph extraction engine for a university lecture.
Your task is to analyze the raw lecture context (OCR from video frames, provided images of the frames, and transcript) and output a structured Knowledge Graph in JSON format.
The graph must contain 'nodes', 'edges', and 'segments'.

Pay VERY close attention to the visual screenshots provided. If you see a problem being solved, a diagram, or a whiteboard calculation, you MUST create a 'question' or 'example' or 'diagram' node for it! Do not rely solely on the transcript.

Schema:
{
  \"lecture_id\": \"<id>\",
  \"nodes\": [
    {
      \"id\": \"node_1\",
      \"node_type\": \"concept\" | \"formula\" | \"code\" | \"diagram\" | \"graph\" | \"table\" | \"example\" | \"question\" | \"unknown\",
      \"timestamp_range\": [start_ms, end_ms],
      \"title\": \"Title of the node\",
      \"ocr_text\": \"Extracted text from slides if relevant\",
      \"transcript_excerpt\": \"Spoken words explaining this\",
      \"screenshot_ref\": \"Screenshot timestamp or id if visual\",
      \"confidence\": \"high\" | \"medium\" | \"low\"
    }
  ],
  \"edges\": [
    { \"from\": \"node_1\", \"to\": \"node_2\", \"relation\": \"explains\" | \"precedes\" | \"example_of\" | \"contrasts_with\" }
  ],
  \"segments\": [] // Leave empty for now, Stage 3 will handle this
}

Rules:
1. Extract every distinct concept, formula, code block, or example as a node. Focus heavily on problems solved and visual examples!
2. Link them logically with edges.
3. Be highly granular. A 60-min lecture might have 50-100 nodes.
4. Output MUST be valid JSON matching the schema.";

    let prompt = format!("Lecture ID: {}\n\nRaw Context:\n{}", lecture_id, raw_text);
    
    let mut image_parts = Vec::new();
    for frame in &ctx.key_frames {
        if let Some(b64) = &frame.image_base64 {
            image_parts.push((b64.clone(), "image/png".to_string()));
        }
    }

    // Use Gemini 2.5 Pro for deep multimodal reasoning when screenshots exist
    let res = if !image_parts.is_empty() {
        GeminiService::generate_multimodal_with_model(&prompt, system_instruction, &image_parts, pool, "gemini-3.1-flash-lite").await?
    } else {
        GeminiService::generate_text_with_model(&prompt, system_instruction, pool, "gemini-3.1-flash-lite").await?
    };

    // Clean markdown formatting if present
    let res = res.replace("```json", "").replace("```", "");
    
    let mut graph: KnowledgeGraph = serde_json::from_str(&res)
        .map_err(|e| AppError::Internal(format!("Failed to parse KnowledgeGraph JSON: {e}\nResponse: {res}")))?;
    
    graph.lecture_id = lecture_id.to_string();
    Ok(graph)
}
