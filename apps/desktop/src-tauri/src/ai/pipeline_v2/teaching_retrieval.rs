use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use crate::error::AppResult;
use crate::services::gemini_service::REFUSAL_STRING;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GroundedCitation {
    pub ref_type: String, // 'timestamp' | 'screenshot' | 'formula' | 'code' | 'concept'
    pub value: String,
    pub excerpt: String,
    pub timestamp_ms: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GroundedChatResponse {
    pub answer: String,
    pub confidence: String, // 'high' | 'medium' | 'low' | 'uncertain'
    pub citations: Vec<GroundedCitation>,
    pub persona: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CrossLectureInsight {
    pub source_lecture_id: String,
    pub target_lecture_id: String,
    pub link_type: String, // 'repeated_concept' | 'prerequisite' | 'progression' | 'contradiction'
    pub explanation: String,
}

pub struct TeachingRetrieval;

impl TeachingRetrieval {
    /// Module 15 & 16: Grounded AI Chat with Persona Adaptation & Source Citations
    pub async fn answer_with_persona(
        lecture_id: &str,
        user_prompt: &str,
        persona: &str, // 'beginner' | 'deep' | 'exam_prep' | 'interview_prep' | 'visual' | 'derivation' | 'proof'
        pool: &SqlitePool,
    ) -> AppResult<GroundedChatResponse> {
        // 1. Retrieve extracted knowledge nodes & visual analyses for focused context
        let nodes = sqlx::query(
            "SELECT id, node_type, title, start_ms, ocr_text, transcript_excerpt, confidence, metadata_json 
             FROM knowledge_nodes WHERE lecture_id = ? ORDER BY start_ms ASC LIMIT 40"
        )
        .bind(lecture_id)
        .fetch_all(pool)
        .await?;

        let visuals = sqlx::query(
            "SELECT screenshot_id, visual_type, domain, description, purpose, importance_score 
             FROM visual_analyses WHERE lecture_id = ? ORDER BY importance_score DESC LIMIT 10"
        )
        .bind(lecture_id)
        .fetch_all(pool)
        .await?;

        // 2. Fetch User Profile for topic personalization (Module 18)
        let profile_rows = sqlx::query(
            "SELECT topic_name, mastery_score FROM user_knowledge_profile ORDER BY last_reviewed_at DESC LIMIT 10"
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        let mut user_mastery_summary = String::new();
        for p in profile_rows {
            let topic_name: String = p.get("topic_name");
            let mastery_score: f64 = p.get("mastery_score");
            user_mastery_summary.push_str(&format!("- {}: mastery {:.0}%\n", topic_name, mastery_score * 100.0));
        }

        // 3. Build persona system prompt
        let persona_instruction = match persona {
            "beginner" => "Explain concepts gently with simple analogies, avoiding excessive jargon. Break down complex steps clearly.",
            "deep" => "Provide exhaustive, mathematically and algorithmically rigorous explanations. Dive into mechanics and underlying principles.",
            "exam_prep" => "Focus strictly on exam high-yield facts, common exam traps, key equations, and step-by-step problem solutions.",
            "interview_prep" => "Structure response like a technical interview answer. Emphasize algorithmic complexity, trade-offs, and optimal design patterns.",
            "visual" => "Provide detailed spatial/visual walkthroughs of diagrams, graphs, and architecture flows.",
            "derivation" => "Provide explicit step-by-step mathematical or logical derivation, showing every equation transform.",
            "proof" => "Provide formal mathematical proof or logical verification of theorems and properties.",
            _ => "Deliver a comprehensive, clear, and well-structured answer."
        };

        let system_instruction = format!(
            r#"You are BACHAM AI, an intelligent lecture tutor.
Persona: {}
User Knowledge Profile:
{}

Rules for Response:
1. Base your response STRICTLY on the provided Knowledge Base.
2. If the requested information is NOT present in the lecture context, respond with: "{}"
3. Format output as valid JSON matching this schema:
{{
  "answer": "Your detailed persona-adapted response in Markdown",
  "confidence": "high" | "medium" | "low" | "uncertain",
  "citations": [
    {{
      "ref_type": "timestamp" | "screenshot" | "formula" | "code" | "concept",
      "value": "Node title or timestamp string",
      "excerpt": "Exact quotation or reference excerpt",
      "timestamp_ms": 12000
    }}
  ]
}}
4. No markdown block wrapping, raw JSON only."#,
            persona_instruction,
            if user_mastery_summary.is_empty() { "No prior profile history." } else { &user_mastery_summary },
            REFUSAL_STRING
        );

        let nodes_str = nodes.iter().map(|n| format!("[{}] {} ({:?}ms): {}", n.get::<String, _>("node_type"), n.get::<String, _>("title"), n.get::<Option<i64>, _>("start_ms"), n.get::<Option<String>, _>("transcript_excerpt").as_deref().unwrap_or(""))).collect::<Vec<_>>().join("\n");
        let visuals_str = visuals.iter().map(|v| format!("[{}] Description: {} (Purpose: {:?})", v.get::<String, _>("visual_type"), v.get::<String, _>("description"), v.get::<Option<String>, _>("purpose"))).collect::<Vec<_>>().join("\n");

        let prompt = format!(
            "User Question: {}\n\nLecture Knowledge Nodes:\n{}\n\nVisual Frame Analyses:\n{}",
            user_prompt,
            nodes_str,
            visuals_str
        );

        let raw_res = crate::services::universal_ai::UniversalAiService::generate_text(&prompt, &system_instruction, pool).await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        if clean_res.contains(REFUSAL_STRING) || clean_res.to_lowercase().contains("couldn't find that information") {
            return Ok(GroundedChatResponse {
                answer: REFUSAL_STRING.to_string(),
                confidence: "low".to_string(),
                citations: vec![],
                persona: persona.to_string(),
            });
        }

        let parsed: serde_json::Value = serde_json::from_str(clean_res).unwrap_or_else(|_| {
            serde_json::json!({
                "answer": raw_res,
                "confidence": "medium",
                "citations": []
            })
        });

        let citations = parsed["citations"].as_array().map(|arr| {
            arr.iter().map(|c| GroundedCitation {
                ref_type: c["ref_type"].as_str().unwrap_or("concept").to_string(),
                value: c["value"].as_str().unwrap_or("").to_string(),
                excerpt: c["excerpt"].as_str().unwrap_or("").to_string(),
                timestamp_ms: c["timestamp_ms"].as_i64(),
            }).collect()
        }).unwrap_or_default();

        Ok(GroundedChatResponse {
            answer: parsed["answer"].as_str().unwrap_or(raw_res.as_str()).to_string(),
            confidence: parsed["confidence"].as_str().unwrap_or("high").to_string(),
            citations,
            persona: persona.to_string(),
        })
    }

    /// Module 17: Cross-Lecture Reasoning across Subject/Course
    pub async fn analyze_cross_lecture_insights(
        course_label: &str,
        pool: &SqlitePool,
    ) -> AppResult<Vec<CrossLectureInsight>> {
        let lectures = sqlx::query!(
            "SELECT id, title FROM lectures WHERE course_label = ? OR course = ? ORDER BY created_at ASC",
            course_label, course_label
        )
        .fetch_all(pool)
        .await?;

        if lectures.len() < 2 {
            return Ok(vec![]);
        }

        let mut lecture_summaries = Vec::new();
        for lec in &lectures {
            let nodes = sqlx::query(
                "SELECT title, node_type FROM knowledge_nodes WHERE lecture_id = ? LIMIT 15"
            )
            .bind(&lec.id)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            let node_titles = nodes.iter().map(|n| format!("{} ({})", n.get::<String, _>("title"), n.get::<String, _>("node_type"))).collect::<Vec<_>>().join(", ");
            lecture_summaries.push(format!("Lecture ID: {}, Title: '{}', Concepts: [{}]", lec.id.as_deref().unwrap_or(""), lec.title, node_titles));
        }

        let system_instruction = r#"You are a Cross-Lecture Reasoning Engine.
Analyze multiple lectures in a subject/course and detect:
- Repeated concepts across lectures
- Prerequisites (Lecture A concept required for Lecture B)
- Knowledge progression (How topics build upon each other)
- Contradictions or subtle changes in terminology

Return ONLY valid JSON matching this schema:
[
  {
    "source_lecture_id": "ID of lecture A",
    "target_lecture_id": "ID of lecture B",
    "link_type": "repeated_concept" | "prerequisite" | "progression" | "contradiction",
    "explanation": "Detailed explanation of relationship"
  }
]
Raw JSON array only."#;

        let prompt = format!("Course: {}\nLectures:\n{}", course_label, lecture_summaries.join("\n"));
        let raw_res = crate::services::universal_ai::UniversalAiService::generate_text(&prompt, system_instruction, pool).await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(clean_res).unwrap_or_default();
        let mut insights = Vec::new();

        for item in parsed {
            let source_id = item["source_lecture_id"].as_str().unwrap_or("").to_string();
            let target_id = item["target_lecture_id"].as_str().unwrap_or("").to_string();
            let link_type = item["link_type"].as_str().unwrap_or("progression").to_string();
            let explanation = item["explanation"].as_str().unwrap_or("").to_string();

            if source_id.is_empty() || target_id.is_empty() || explanation.is_empty() { continue; }

            let link_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO cross_lecture_links (id, source_lecture_id, target_lecture_id, link_type, explanation)
                 VALUES (?, ?, ?, ?, ?)"
            )
            .bind(&link_id)
            .bind(&source_id)
            .bind(&target_id)
            .bind(&link_type)
            .bind(&explanation)
            .execute(pool).await;

            insights.push(CrossLectureInsight {
                source_lecture_id: source_id,
                target_lecture_id: target_id,
                link_type,
                explanation,
            });
        }

        Ok(insights)
    }

    /// Module 18: Update Personal Knowledge Profile after Quiz Attempts
    pub async fn record_quiz_attempt(
        topic_name: &str,
        is_correct: bool,
        pool: &SqlitePool,
    ) -> AppResult<()> {
        let topic_id = format!("topic_{}", topic_name.to_lowercase().replace(" ", "_"));
        let now = chrono::Utc::now().timestamp_millis();

        let existing = sqlx::query(
            "SELECT topic_id, mastery_score, total_quizzes, correct_quizzes FROM user_knowledge_profile WHERE topic_id = ?"
        )
        .bind(&topic_id)
        .fetch_optional(pool)
        .await?;

        if let Some(row) = existing {
            let total: i64 = row.get("total_quizzes");
            let correct: i64 = row.get("correct_quizzes");
            let new_total = total + 1;
            let new_correct = correct + if is_correct { 1 } else { 0 };
            let new_mastery = new_correct as f64 / new_total as f64;

            let _ = sqlx::query(
                "UPDATE user_knowledge_profile SET mastery_score = ?, total_quizzes = ?, correct_quizzes = ?, last_reviewed_at = ? WHERE topic_id = ?"
            )
            .bind(new_mastery)
            .bind(new_total)
            .bind(new_correct)
            .bind(now)
            .bind(&topic_id)
            .execute(pool).await;
        } else {
            let total = 1;
            let correct = if is_correct { 1 } else { 0 };
            let mastery = correct as f64;

            let _ = sqlx::query(
                "INSERT INTO user_knowledge_profile (topic_id, topic_name, mastery_score, total_quizzes, correct_quizzes, last_reviewed_at)
                 VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&topic_id)
            .bind(topic_name)
            .bind(mastery)
            .bind(total)
            .bind(correct)
            .bind(now)
            .execute(pool).await;
        }

        Ok(())
    }
}
