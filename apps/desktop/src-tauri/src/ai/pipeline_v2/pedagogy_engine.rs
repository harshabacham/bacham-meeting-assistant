use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::AppResult;
use super::knowledge_extraction::{ExtractedKnowledgePipeline, ExtractedNode};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TextbookSummary {
    #[serde(default)]
    pub overview: String,
    #[serde(default, alias = "quickSummary")]
    pub quick_summary: Option<String>,
    #[serde(default, alias = "standardSummary")]
    pub standard_summary: Option<String>,
    #[serde(default, alias = "deepNotes")]
    pub deep_notes: Option<String>,
    #[serde(default, alias = "textbookNotes")]
    pub textbook_notes: Option<String>,
    #[serde(default)]
    pub objectives: Vec<String>,
    #[serde(default, alias = "chapterBreakdown", alias = "chapters")]
    pub chapter_breakdown: Vec<serde_json::Value>,
    #[serde(default, alias = "conceptsAndDefinitions", alias = "concepts")]
    pub concepts_and_definitions: Vec<serde_json::Value>,
    #[serde(default, alias = "formulaSheet", alias = "formulas")]
    pub formula_sheet: Vec<serde_json::Value>,
    #[serde(default, alias = "codeExplained", alias = "code")]
    pub code_explained: Vec<serde_json::Value>,
    #[serde(default, alias = "visualExplanations", alias = "visuals")]
    pub visual_explanations: Vec<serde_json::Value>,
    #[serde(default, alias = "cheatSheet")]
    pub cheat_sheet: String,
    #[serde(default, alias = "revisionTips")]
    pub revision_tips: Vec<String>,
    #[serde(default, alias = "interviewQuestions")]
    pub interview_questions: Vec<serde_json::Value>,
    #[serde(default, alias = "examQuestions")]
    pub exam_questions: Vec<serde_json::Value>,
    #[serde(default, alias = "keyTakeaways")]
    pub key_takeaways: Vec<String>,
    #[serde(default, alias = "crmMetadata", alias = "crm_metadata")]
    pub crm_metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeneratedFlashcard {
    #[serde(default)]
    pub question: String,
    #[serde(default)]
    pub answer: String,
    #[serde(default)]
    pub difficulty: String,
    #[serde(default, alias = "conceptNodeId", alias = "node_id", alias = "node_title")]
    pub concept_node_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeneratedQuizQuestion {
    #[serde(default, alias = "quizType", alias = "type")]
    pub quiz_type: String, // 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'code' | 'formula'
    #[serde(default)]
    pub difficulty: String, // 'easy' | 'medium' | 'hard'
    #[serde(default)]
    pub question: String,
    #[serde(default, alias = "answerKey", alias = "answer")]
    pub answer_key: String,
    #[serde(default)]
    pub options: Vec<String>,
    #[serde(default)]
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

ANTI-HALLUCINATION & STRICT GROUNDING RULES:
1. Ground every claim directly in the provided transcript and visual keyframe evidence. Do NOT invent facts or discussions that did not take place.
2. Embed exact timestamps [MM:SS] referencing the transcript for key discussion points, decisions, and slide changes (e.g. `- [04:12] The team agreed on...`).
3. If visual slides/diagrams are present, cite them with `[Slide @ MM:SS]` and describe their content with clarity and precision.
4. ONLY populate sections if actual relevant content was discussed in the recording. If no mathematical formulas were discussed, return `formula_sheet: []`. If no programming code was shown, return `code_explained: []`. If no action items or sales criteria were assigned, return `crm_metadata: { action_items: [], key_decisions: [], bant: null }`.
5. NEVER output placeholder text like "Not identified", "None", or "N/A". If an item does not exist, leave it as an empty array `[]` or null.

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
  "cheat_sheet": "Concise Markdown cheat sheet summarizing key concepts for rapid review",
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

        let parsed: TextbookSummary = Self::parse_textbook_summary(&raw_res);

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

    /// Comprehensive JSON cleaner and repair engine for LLM outputs
    pub fn repair_json_string(raw: &str) -> String {
        let mut s = raw.trim();

        // 1. Strip markdown code block wrappers
        if s.starts_with("```json") {
            s = &s[7..];
        } else if s.starts_with("```") {
            s = &s[3..];
        }
        if s.ends_with("```") {
            s = &s[..s.len() - 3];
        }
        s = s.trim();

        // 2. Extract JSON object substring between first '{' and last '}'
        let start = s.find('{').unwrap_or(0);
        let end = s.rfind('}').map(|i| i + 1).unwrap_or(s.len());
        let mut cleaned = if start < end { s[start..end].to_string() } else { s.to_string() };

        // 3. Fix unquoted object keys (e.g. `sakeaway: "..."` or `, key_name:`)
        if let Ok(re_unquoted) = regex::Regex::new(r#"(?m)([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:"#) {
            cleaned = re_unquoted.replace_all(&cleaned, r#"$1"$2":"#).to_string();
        }

        // 4. Fix trailing commas before } or ]
        if let Ok(re_trailing) = regex::Regex::new(r#",\s*([}\]])"#) {
            cleaned = re_trailing.replace_all(&cleaned, "$1").to_string();
        }

        cleaned
    }

    /// Parse TextbookSummary with multi-tier error recovery and guaranteed resilience
    pub fn parse_textbook_summary(raw: &str) -> TextbookSummary {
        let clean_res = raw.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        // Strategy 1: Direct Serde JSON deserialize
        if let Ok(summary) = serde_json::from_str::<TextbookSummary>(clean_res) {
            return summary;
        }

        // Strategy 2: Repaired JSON deserialize
        let repaired = Self::repair_json_string(clean_res);
        if let Ok(summary) = serde_json::from_str::<TextbookSummary>(&repaired) {
            return summary;
        }

        // Strategy 3: Loose Value deserialize with repair
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&repaired) {
            if let Ok(summary) = serde_json::from_value::<TextbookSummary>(val) {
                return summary;
            }
        }

        // Strategy 4: Fallback field extractor (guaranteed never to crash)
        let extract_str = |key1: &str, key2: &str| -> Option<String> {
            let pat = format!(r#"(?s)"(?:{}|{})"\s*:\s*"((?:[^"\\]|\\.)*)""#, key1, key2);
            if let Ok(re) = regex::Regex::new(&pat) {
                if let Some(caps) = re.captures(&repaired) {
                    if let Some(m) = caps.get(1) {
                        return Some(m.as_str().replace(r#"\""#, "\"").replace(r#"\n"#, "\n"));
                    }
                }
            }
            None
        };

        let quick_summary = extract_str("quick_summary", "quickSummary");
        let standard_summary = extract_str("standard_summary", "standardSummary");
        let deep_notes = extract_str("deep_notes", "deepNotes");
        let textbook_notes = extract_str("textbook_notes", "textbookNotes");
        let overview = extract_str("overview", "overview").unwrap_or_else(|| {
            standard_summary.clone().unwrap_or_else(|| "Session summary generated.".to_string())
        });
        let cheat_sheet = extract_str("cheat_sheet", "cheatSheet").unwrap_or_default();

        TextbookSummary {
            overview,
            quick_summary,
            standard_summary,
            deep_notes,
            textbook_notes,
            objectives: vec![],
            chapter_breakdown: vec![],
            concepts_and_definitions: vec![],
            formula_sheet: vec![],
            code_explained: vec![],
            visual_explanations: vec![],
            cheat_sheet,
            revision_tips: vec![],
            interview_questions: vec![],
            exam_questions: vec![],
            key_takeaways: vec![],
            crm_metadata: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_textbook_summary_snake_case_deserialization() {
        let json_data = r###"{
            "quick_summary": "- [00:05] Standup started\n- [00:15] Completed API refactoring",
            "standard_summary": "In this daily standup, the team reviewed the API refactoring progress.",
            "deep_notes": "Deep notes with technical details [Slide @ 00:10].",
            "textbook_notes": "# Standup Notes\n\n## Summary",
            "overview": "Daily team check-in and progress review.",
            "objectives": ["Review API progress", "Plan release"],
            "chapter_breakdown": [
                { "title": "API Review", "summary": "Walkthrough of backend changes [00:10]" }
            ],
            "concepts_and_definitions": [
                { "term": "API Refactoring", "definition": "Restructuring existing code", "explanation": "Improves maintainability" }
            ],
            "formula_sheet": [],
            "code_explained": [],
            "visual_explanations": [],
            "cheat_sheet": "Key points for standup",
            "revision_tips": ["Check PR status"],
            "interview_questions": [],
            "exam_questions": [],
            "key_takeaways": ["API refactoring on track"],
            "crm_metadata": {
                "action_items": [
                    { "task": "Review PR 102", "owner": "Alex", "priority": "high", "due_date": "2026-08-18" }
                ],
                "key_decisions": ["Merge to main tomorrow"],
                "bant": null
            }
        }"###;

        let parsed: Result<TextbookSummary, _> = serde_json::from_str(json_data);
        assert!(parsed.is_ok(), "Failed to deserialize snake_case TextbookSummary: {:?}", parsed.err());
        let summary = parsed.unwrap();
        assert_eq!(summary.overview, "Daily team check-in and progress review.");
        assert_eq!(summary.quick_summary.unwrap(), "- [00:05] Standup started\n- [00:15] Completed API refactoring");
        assert_eq!(summary.chapter_breakdown.len(), 1);
        assert_eq!(summary.key_takeaways.len(), 1);
    }

    #[test]
    fn test_textbook_summary_camel_case_deserialization() {
        let json_data = r###"{
            "quickSummary": "Quick summary",
            "standardSummary": "Standard summary",
            "deepNotes": "Deep notes",
            "textbookNotes": "Textbook notes",
            "overview": "Overview text",
            "objectives": ["Objective 1"],
            "chapterBreakdown": [{ "title": "Chapter 1" }],
            "conceptsAndDefinitions": [{ "term": "Term 1", "definition": "Def 1" }],
            "formulaSheet": [{ "formula": "E=mc^2" }],
            "codeExplained": [{ "language": "Rust", "purpose": "Speed" }],
            "visualExplanations": [{ "title": "Architecture" }],
            "cheatSheet": "Cheat notes",
            "revisionTips": ["Tip 1"],
            "interviewQuestions": [{ "question": "What is ownership?" }],
            "examQuestions": [{ "question": "Explain borrow checker." }],
            "keyTakeaways": ["Rust is memory-safe"],
            "crmMetadata": {
                "actionItems": [],
                "keyDecisions": []
            }
        }"###;

        let parsed: Result<TextbookSummary, _> = serde_json::from_str(json_data);
        assert!(parsed.is_ok(), "Failed to deserialize camelCase TextbookSummary: {:?}", parsed.err());
        let summary = parsed.unwrap();
        assert_eq!(summary.quick_summary.unwrap(), "Quick summary");
        assert_eq!(summary.formula_sheet.len(), 1);
        assert_eq!(summary.code_explained.len(), 1);
    }

    #[test]
    fn test_textbook_summary_audio_only_minimal_fields() {
        let json_data = r###"{
            "overview": "Blind audio discussion on product roadmap.",
            "quick_summary": "- [01:20] Pricing discussion",
            "standard_summary": "Discussed roadmap and tier adjustments."
        }"###;

        let parsed: Result<TextbookSummary, _> = serde_json::from_str(json_data);
        assert!(parsed.is_ok(), "Failed to deserialize minimal audio-only TextbookSummary: {:?}", parsed.err());
        let summary = parsed.unwrap();
        assert_eq!(summary.overview, "Blind audio discussion on product roadmap.");
        assert!(summary.formula_sheet.is_empty());
        assert!(summary.code_explained.is_empty());
        assert!(summary.visual_explanations.is_empty());
    }

    #[test]
    fn test_quiz_and_flashcard_deserialization() {
        let flashcards_json = r###"[
            {
                "question": "What is the capital of France?",
                "answer": "Paris",
                "difficulty": "easy",
                "node_title": "Geography"
            }
        ]"###;
        let cards: Result<Vec<GeneratedFlashcard>, _> = serde_json::from_str(flashcards_json);
        assert!(cards.is_ok());

        let quiz_json = r###"[
            {
                "quizType": "mcq",
                "difficulty": "medium",
                "question": "Which sorting algorithm is O(n log n)?",
                "answerKey": "Merge Sort",
                "options": ["Merge Sort", "Bubble Sort", "Insertion Sort"],
                "explanation": "Merge sort divides the array in half each time."
            }
        ]"###;
        let quiz: Result<Vec<GeneratedQuizQuestion>, _> = serde_json::from_str(quiz_json);
        assert!(quiz.is_ok());
    }

    #[test]
    fn test_repair_unquoted_keys_malformed_llm_json() {
        let malformed_json = r###"{
            "quick_summary": "Quick summary",
            "standard_summary": "Standard summary",
            "deep_notes": "Deep notes",
            "textbook_notes": "Textbook notes",
            "overview": "Overview text",
            "visual_explanations": [
                {
                    "title": "YouTube Video Watch Page Interface",
                    "explanation": "Standard layout displaying the media player",
                    sakeaway: "Highlights how modern streaming platforms organize media metadata"
                }
            ]
        }"###;

        let summary = PedagogyEngine::parse_textbook_summary(malformed_json);
        assert_eq!(summary.overview, "Overview text");
        assert_eq!(summary.quick_summary.unwrap(), "Quick summary");
        assert_eq!(summary.visual_explanations.len(), 1);
    }
}
