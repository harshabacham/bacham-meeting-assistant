use sqlx::SqlitePool;
use crate::error::AppResult;
use uuid::Uuid;
use crate::ai::context_builder::ContextBuilder;

pub async fn generate_multi_level_summary(lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
    // 1. Fetch transcript and keyframes
    let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
    
    let mut enriched_transcript = String::new();
    let mut image_parts = Vec::new();

    if !ctx.transcript_segments.is_empty() {
        for segment in &ctx.transcript_segments {
            enriched_transcript.push_str(&segment.content);
            enriched_transcript.push_str("\n\n");
        }
    } else {
        enriched_transcript.push_str("No transcript available.");
    }

    if !ctx.key_frames.is_empty() {
        enriched_transcript.push_str("\n\n--- SLIDE TEXT (OCR) ---\n");
        for (i, frame) in ctx.key_frames.iter().enumerate() {
            if let Some(ocr) = &frame.ocr_text {
                if !ocr.trim().is_empty() {
                    enriched_transcript.push_str(&format!("Slide {}:\n{}\n\n", i + 1, ocr));
                }
            }
            if let Some(b64) = &frame.image_base64 {
                image_parts.push((b64.clone(), "image/png".to_string()));
            }
        }
    }

    // Fetch workspace_type
    let workspace_type: String = sqlx::query_scalar!(
        "SELECT workspace_type FROM lectures WHERE id = ?",
        lecture_id
    )
    .fetch_optional(pool)
    .await?
    .flatten()
    .unwrap_or_else(|| "lecture".to_string());

    // Fetch Granola-style Live Scratchpad notes
    let live_scratchpad: Option<String> = sqlx::query_scalar!(
        "SELECT content_json FROM lecture_artifacts WHERE lecture_id = ? AND artifact_type = 'live_scratchpad'",
        lecture_id
    )
    .fetch_optional(pool)
    .await?;

    if let Some(notes) = live_scratchpad {
        if !notes.trim().is_empty() {
            enriched_transcript.push_str("\n\n--- USER's ROUGH NOTES (Granola Scratchpad) ---\n");
            enriched_transcript.push_str(&notes);
            enriched_transcript.push_str("\n\nCRITICAL INSTRUCTION: The user provided these rough shorthand notes during the meeting. You MUST seamlessly merge these observations into your final summaries and action items. Do not treat them as a separate block, weave their intent into the content.\n");
        }
    }

    // Fetch language from settings
    let language: String = sqlx::query_scalar!(
        "SELECT value FROM settings WHERE key = 'language'"
    )
    .fetch_optional(pool)
    .await?
    .unwrap_or_else(|| "en".to_string());
    
    enriched_transcript.push_str(&format!("\n\nCRITICAL INSTRUCTION: You MUST output your entire response natively in the language code: {}.\n", language));

    // 2. Build massive unified prompt for 4-tier summary based on workspace_type
    let instruction = if workspace_type == "meeting" {
        r###"You are an expert AI meeting assistant and executive scribe.
Your task is to analyze the provided transcript dialogue and visual slides to generate a deeply grounded, comprehensive multi-tier meeting record.

CRITICAL INSTRUCTIONS:
- You MUST write REAL, detailed, insightful Markdown content for EVERY field below based on the actual recorded transcript and visual slides.
- Do NOT output schema descriptions, placeholder text, or filler.
- Ground every statement directly in the transcript. Embed exact timestamps [MM:SS] for all key decisions and discussion points.

Return a valid JSON object with the following schema:
{
  "quick_summary": "# ⚡ Key Takeaways & Executive Decisions\n- Detailed bullet points of main decisions and core outcomes with [MM:SS] timestamps...",
  "standard_summary": "# 📋 Executive Meeting Summary\n## Context & Agenda\nDetailed summary...\n## Key Discussion Points\nIn-depth review of topics discussed...\n## Outcomes & Next Steps\nActionable conclusions...",
  "deep_notes": "# 🔍 Comprehensive Discussion Notes & Context\n## Topic Breakdown & Debates\nExhaustive analysis of debates, alternatives considered, technical trade-offs...\n## Visual Slide Analysis\nDetailed explanation of diagrams or shared slides...",
  "textbook_notes": "# 📑 Full Meeting Minutes & Governance Record\n## Meeting Objectives\n...\n## In-Depth Discussion Record\n...\n## Open Questions & Risks\n...",
  "chapter_breakdown": [ { "title": "string", "summary": "Detailed chapter summary with timestamps", "timestamp_hint": "MM:SS" } ],
  "crm_metadata": { 
    "bant": { "budget": "string or null", "authority": "string or null", "need": "string or null", "timeline": "string or null" }, 
    "key_decisions": ["string with [MM:SS] timestamp citations"] 
  }
}

CRITICAL RULES:
- Use highly detailed, rich markdown formatting. You MUST use callouts like `💡 **Key Idea:**` and `⚠️ **Important Risk:**` where applicable.
- Where appropriate, present complex information or step-by-step logic in neat Markdown tables (e.g., `Step | Action | Result`).
- Return ONLY the raw JSON object. Do not wrap in ```json blocks."###.to_string()
    } else {
        r###"You are a distinguished university professor and world-class AI learning assistant.
Your task is to analyze the provided lecture transcript and visual slides (diagrams, math, code, whiteboard) to generate comprehensive, publication-quality study notes.

CRITICAL INSTRUCTIONS:
- You MUST write REAL, rich, publication-quality Markdown content for EVERY field below based on what the instructor actually taught in the transcript and visual slides.
- Do NOT output schema descriptions, placeholder text, or filler.
- Ground every concept, formula, and code example directly in the lecture. Embed exact timestamps [MM:SS].

Return a valid JSON object with the following schema:
{
  "quick_summary": "# ⚡ Rapid Revision (30s Read)\n- Core takeaways, fundamental concepts, and essential summary points with [MM:SS] timestamps...",
  "standard_summary": "# 📖 Standard Lecture Notes (5m Read)\n## Lecture Overview\nDetailed overview of the topic...\n## Core Concepts & Definitions\nKey definitions and explanations...\n## Key Examples & Applications\nReal-world applications...",
  "deep_notes": "# 🔬 In-Depth Academic Breakdown (15m Read)\n## Rigorous Explanations & Theory\nDeep dive into the underlying theory...\n## Visual & Diagram Walkthroughs\nStep-by-step walkthrough of visuals...\n## Common Traps & Exam Tips\nCritical traps and insights...",
  "textbook_notes": "# 📚 Textbook Chapter\n## Introduction & Learning Objectives\nObjectives...\n## In-Depth Derivations & Logic\nComprehensive derivations...\n## Frequently Asked Questions\nDetailed FAQs...",
  "chapter_breakdown": [ { "title": "string", "summary": "Detailed chapter summary with timestamps", "timestamp_hint": "MM:SS" } ],
  "formula_sheet": [ { "formula": "LaTeX string (e.g. O(V+E))", "meaning": "string", "variables": "string", "example": "string" } ],
  "problems_solved": [ { "question": "string", "step_by_step": "string", "final_answer": "string", "professors_explanation": "string" } ]
}

CRITICAL RULES:
- Use highly detailed, rich markdown formatting. You MUST explicitly use callouts like `💡 **Key Idea:**` and `⚠️ **Common Mistake:**` where applicable.
- Where appropriate, present complex logic, algorithms, or step-by-step workflows in neat Markdown tables (e.g., `Step | Action | Queue State | Visited Nodes`).
- Return ONLY the raw JSON object. Do not wrap in ```json blocks."###.to_string()
    };

    // 3. Generate content via Gemini
    let content = if image_parts.is_empty() {
        crate::services::universal_ai::UniversalAiService::generate_text(&enriched_transcript, &instruction, pool).await?
    } else {
        crate::services::universal_ai::UniversalAiService::generate_multimodal(&enriched_transcript, &instruction, &image_parts, pool).await?
    };

    // 4. Upsert into summaries table
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO summaries (id, lecture_id, content, model_used, summary_level) VALUES (?, ?, ?, 'gemini-2.0-flash-lite', 'multi-tier')"
    )
    .bind(id)
    .bind(lecture_id)
    .bind(content)
    .execute(pool)
    .await?;
    
    Ok(())
}
