use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use super::knowledge_extraction::{ExtractedKnowledgePipeline, ExtractedNode};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TextbookSummary {
    pub overview: String,
    #[serde(default)]
    pub quick_summary: Option<String>,
    #[serde(default)]
    pub standard_summary: Option<String>,
    #[serde(default)]
    pub deep_notes: Option<String>,
    #[serde(default)]
    pub textbook_notes: Option<String>,
    pub objectives: Vec<String>,
    pub chapter_breakdown: Vec<serde_json::Value>,
    pub concepts_and_definitions: Vec<serde_json::Value>,
    pub formula_sheet: Vec<serde_json::Value>,
    pub code_explained: Vec<serde_json::Value>,
    pub visual_explanations: Vec<serde_json::Value>,
    pub cheat_sheet: String,
    pub revision_tips: Vec<String>,
    pub interview_questions: Vec<serde_json::Value>,
    pub exam_questions: Vec<serde_json::Value>,
    pub key_takeaways: Vec<String>,
    #[serde(rename = "crm_metadata", default)]
    pub crm_metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedFlashcard {
    pub question: String,
    pub answer: String,
    pub difficulty: String,
    pub concept_node_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedQuizQuestion {
    pub quiz_type: String, // 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'code' | 'formula'
    pub difficulty: String, // 'easy' | 'medium' | 'hard'
    pub question: String,
    pub answer_key: String,
    pub options: Vec<String>,
    pub explanation: String,
}

pub struct PedagogyEngine;

impl PedagogyEngine {
    /// Module 12: Generate Multimodal Grounded Multi-Tier Summary
    pub async fn generate_textbook_summary(
        lecture_id: &str,
        extracted: &ExtractedKnowledgePipeline,
        full_transcript: &str,
        visual_context: &str,
        image_parts: &[(String, String)],
        pool: &SqlitePool,
    ) -> AppResult<TextbookSummary> {
        let system_instruction = r#"You are the Pedagogical & Meeting Intelligence Engine of the BACHAM AI Assistant.
Your objective is to generate comprehensive, publication-quality notes and multi-tier summaries deeply grounded in the actual transcript dialogue, slides, OCR text, and visual images.

ANTI-HALLUCINATION & MULTIMODAL GROUNDING RULES:
1. Ground every claim directly in the provided transcript and visual keyframe evidence. Do NOT invent facts or discussions that did not take place.
2. Embed exact timestamps [MM:SS] referencing the transcript for key discussion points, decisions, and slide changes (e.g. `- [04:12] The team agreed on...`).
3. If visual slides/diagrams are present, cite them with `[Slide @ MM:SS]` and describe their content with clarity and precision.
4. For meetings, extract all Action Items (with tasks, owners, priorities, and due dates) into `crm_metadata.action_items` and key decisions into `crm_metadata.key_decisions`.
5. For technical lectures, extract mathematical formulas into `formula_sheet` and code algorithms into `code_explained`.

Return ONLY valid JSON matching this schema:
{
  "quick_summary": "Crisp 30-second markdown summary with punchy bulleted key takeaways, core decisions, and main outcomes with [MM:SS] timestamps.",
  "standard_summary": "Balanced 5-minute markdown summary covering executive overview, core discussion topics, definitions, outcomes, and next steps.",
  "deep_notes": "In-depth 15-minute markdown notes covering detailed technical nuances, debates, context, visual slide explanations [Slide @ MM:SS], and edge cases.",
  "textbook_notes": "Comprehensive, highly detailed publication-ready textbook chapter or exhaustive meeting minutes with Introduction, deep derivations, real-world examples, and FAQs.",
  "overview": "Comprehensive high-level summary of the entire session",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "chapter_breakdown": [
    { "title": "Chapter title", "summary": "Detailed chapter breakdown with key timestamps [MM:SS]" }
  ],
  "concepts_and_definitions": [
    { "term": "Concept or Term", "definition": "Formal definition", "explanation": "Detailed explanation with real-world analogy" }
  ],
  "formula_sheet": [
    { "formula": "LaTeX formula string", "meaning": "Meaning", "variables": "Variables breakdown", "derivation": "Derivation steps", "exam_tip": "Common exam trap" }
  ],
  "code_explained": [
    { "language": "Python/C++/Java/Rust/TS", "purpose": "Algorithm purpose", "logic": "Step-by-step logic", "code_snippet": "Clean code", "complexity": "Big-O time & space" }
  ],
  "visual_explanations": [
    { "title": "Diagram/Graph/Visual Title", "explanation": "Deep explanation of visual component", "key_takeaway": "Key takeaway" }
  ],
  "cheat_sheet": "Concise Markdown cheat sheet summarizing formulas, key concepts, and code shortcuts for rapid pre-exam review",
  "revision_tips": ["Revision tip 1", "Revision tip 2"],
  "interview_questions": [
    { "question": "Technical interview question", "expected_answer": "Model answer", "difficulty": "medium" }
  ],
  "exam_questions": [
    { "question": "University exam problem", "solution": "Step-by-step solution", "difficulty": "hard" }
  ],
  "key_takeaways": ["Takeaway 1", "Takeaway 2"],
  "crm_metadata": { 
    "action_items": [ { "task": "string", "owner": "string", "priority": "high|medium|low", "due_date": "string or null" } ],
    "key_decisions": ["string"],
    "bant": { "budget": "string|null", "authority": "string|null", "need": "string|null", "timeline": "string|null" }
  }
}

Raw JSON only, no markdown fencing."#;

        let nodes_json = serde_json::to_string_pretty(&extracted.nodes).unwrap_or_default();
        let chapters_json = serde_json::to_string_pretty(&extracted.chapters).unwrap_or_default();

        let prompt = format!(
            "=== FULL TRANSCRIPT WITH TIMESTAMPS ===\n{}\n\n=== VISUAL SLIDES & OCR CONTEXT ===\n{}\n\n=== TOPIC CHAPTERS ===\n{}\n\n=== EXTRACTED KNOWLEDGE NODES ===\n{}",
            if full_transcript.trim().is_empty() { "No transcript audio recorded." } else { full_transcript },
            if visual_context.trim().is_empty() { "No visual slides recorded." } else { visual_context },
            chapters_json,
            nodes_json
        );

        let raw_res = if image_parts.is_empty() {
            crate::services::universal_ai::UniversalAiService::generate_text(&prompt, system_instruction, pool).await?
        } else {
            crate::services::universal_ai::UniversalAiService::generate_multimodal(&prompt, system_instruction, image_parts, pool).await?
        };

        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        let parsed: TextbookSummary = serde_json::from_str(clean_res).map_err(|e| {
            AppError::Internal(format!("Failed to parse TextbookSummary JSON: {e}\nRaw: {clean_res}"))
        })?;

        // Save summary artifact to DB
        let artifact_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let json_str = serde_json::to_string(&parsed).unwrap_or_default();

        let _ = sqlx::query(
            "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, status)
             VALUES (?, ?, 'lecture_intelligence', ?, ?, 'gemini-2.0-flash-lite', 'done')
             ON CONFLICT(id) DO UPDATE SET content_json = EXCLUDED.content_json, status = 'done'"
        )
        .bind(&artifact_id)
        .bind(lecture_id)
        .bind(&json_str)
        .bind(now)
        .execute(pool).await;

        Ok(parsed)
    }

    /// Module 13: Generate Concept-Driven Flashcards
    pub async fn generate_concept_flashcards(
        lecture_id: &str,
        nodes: &[ExtractedNode],
        pool: &SqlitePool,
    ) -> AppResult<Vec<GeneratedFlashcard>> {
        if nodes.is_empty() {
            return Ok(vec![]);
        }

        let system_instruction = r#"You are a flashcard generator.
Generate high-yield active recall flashcards based directly on the provided structured knowledge nodes (concepts, formulas, code, diagrams, graphs).

Return ONLY valid JSON matching this schema:
[
  {
    "question": "Front of card (specific question, formula prompt, or code bug identification)",
    "answer": "Back of card (concise, clear answer with bullet points or derivation)",
    "difficulty": "easy" | "medium" | "hard",
    "node_title": "Matching node title"
  }
]

Rules:
1. Target active recall: ask "Why does X happen?", "What is the derivation for Y?", "How does algorithm Z work?".
2. Do not create cards for trivial transcript greetings or filler text.
3. Return raw JSON array only."#;

        let nodes_text = serde_json::to_string_pretty(nodes).unwrap_or_default();
        let raw_res = crate::services::universal_ai::UniversalAiService::generate_text(&nodes_text, system_instruction, pool).await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(clean_res).unwrap_or_default();
        let mut cards = Vec::new();

        for item in parsed {
            let question = item["question"].as_str().unwrap_or("").to_string();
            let answer = item["answer"].as_str().unwrap_or("").to_string();
            let difficulty = item["difficulty"].as_str().unwrap_or("medium").to_string();
            if question.is_empty() || answer.is_empty() { continue; }

            let card_id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();

            let _ = sqlx::query(
                "INSERT INTO flashcards (id, lecture_id, question, answer, created_at, difficulty)
                 VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&card_id)
            .bind(lecture_id)
            .bind(&question)
            .bind(&answer)
            .bind(&now)
            .bind(&difficulty)
            .execute(pool).await;

            cards.push(GeneratedFlashcard {
                question,
                answer,
                difficulty,
                concept_node_id: None,
            });
        }

        Ok(cards)
    }

    /// Module 14: Generate Multi-Format Quizzes
    pub async fn generate_multi_format_quiz(
        lecture_id: &str,
        nodes: &[ExtractedNode],
        pool: &SqlitePool,
    ) -> AppResult<Vec<GeneratedQuizQuestion>> {
        if nodes.is_empty() {
            return Ok(vec![]);
        }

        let system_instruction = r#"You are an exam and quiz question generator for university courses.
Generate a comprehensive quiz covering multiple formats:
- Multiple Choice Questions (MCQs)
- True / False
- Fill in the Blanks
- Short Answer / Derivation
- Code / Algorithm Output Questions

Return ONLY valid JSON matching this schema:
[
  {
    "quiz_type": "mcq" | "true_false" | "fill_blank" | "short_answer" | "code" | "formula",
    "difficulty": "easy" | "medium" | "hard",
    "question": "Question text",
    "answer_key": "Correct answer string",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "explanation": "Step-by-step explanation of why this answer is correct"
  }
]

Rules:
1. Include a mix of easy, medium, and hard questions.
2. For MCQs, provide exactly 4 options.
3. For short answer/code/formula questions, options can be empty array [].
4. Raw JSON array only."#;

        let nodes_text = serde_json::to_string_pretty(nodes).unwrap_or_default();
        let raw_res = crate::services::universal_ai::UniversalAiService::generate_text(&nodes_text, system_instruction, pool).await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(clean_res).unwrap_or_default();
        let mut questions = Vec::new();

        for item in parsed {
            let quiz_type = item["quiz_type"].as_str().unwrap_or("mcq").to_string();
            let difficulty = item["difficulty"].as_str().unwrap_or("medium").to_string();
            let question = item["question"].as_str().unwrap_or("").to_string();
            let answer_key = item["answer_key"].as_str().unwrap_or("").to_string();
            let explanation = item["explanation"].as_str().unwrap_or("").to_string();
            let options: Vec<String> = item["options"].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default();

            if question.is_empty() || answer_key.is_empty() { continue; }

            let quiz_id = Uuid::new_v4().to_string();
            let options_json = serde_json::to_string(&options).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT INTO quizzes (id, lecture_id, type, difficulty, question, answer_key, options)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&quiz_id)
            .bind(lecture_id)
            .bind(&quiz_type)
            .bind(&difficulty)
            .bind(&question)
            .bind(&answer_key)
            .bind(&options_json)
            .execute(pool).await;

            questions.push(GeneratedQuizQuestion {
                quiz_type,
                difficulty,
                question,
                answer_key,
                options,
                explanation,
            });
        }

        Ok(questions)
    }
}
