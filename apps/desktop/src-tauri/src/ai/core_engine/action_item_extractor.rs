use sqlx::SqlitePool;
use crate::error::AppResult;
use uuid::Uuid;
use crate::ai::context_builder::ContextBuilder;

pub async fn extract_action_items(lecture_id: &str, pool: &SqlitePool) -> AppResult<()> {
    // Fetch transcript context
    let ctx = ContextBuilder::build(pool, lecture_id, true).await?;
    
    let mut enriched_transcript = String::new();

    if !ctx.transcript_segments.is_empty() {
        for segment in &ctx.transcript_segments {
            enriched_transcript.push_str(&segment.content);
            enriched_transcript.push_str("\n\n");
        }
    } else {
        return Ok(()); // Nothing to extract from
    }

    // Fetch language from settings
    let language: String = sqlx::query_scalar!(
        "SELECT value FROM settings WHERE key = 'language'"
    )
    .fetch_optional(pool)
    .await?
    .unwrap_or_else(|| "en".to_string());

    let instruction = format!(
        "You are an elite AI meeting assistant. Your ONLY job is to extract actionable items, follow-ups, and tasks from the provided meeting transcript with extreme precision.\n\
         First, analyze the transcript and think step-by-step about what tasks were actually committed to (not just passing ideas). Output your thinking in the `_reasoning` field.\n\
         Then, output the concrete tasks in the `action_items` array.\n\
         You must return ONLY a raw JSON object. Do not include markdown, conversational text, or anything else.\n\
         Ensure all extraction is in the language code: {}.\n\
         Follow this exact JSON schema:\n\
         {{\n\
           \"_reasoning\": \"string (Your step-by-step analysis of who committed to what, and why it is a real task)\",\n\
           \"action_items\": [\n\
             {{\n\
               \"task\": \"string (clear description)\",\n\
               \"owner\": \"string (who is responsible, or 'Unassigned')\",\n\
               \"priority\": \"string (urgent, high, medium, low)\",\n\
               \"category\": \"string (follow_up, development, documentation, scheduling, review, general)\",\n\
               \"raw_quote\": \"string (The exact quote from the transcript proving this task exists)\",\n\
               \"context\": \"string (Brief context on why this task is needed)\",\n\
               \"due_date\": \"string (e.g. 'Next Friday', 'EOD tomorrow', or null if none)\",\n\
               \"due_date_iso\": \"string (ISO 8601 format if possible to infer, else null)\",\n\
               \"timestamp_hint\": \"string (Approximate time or context clue, e.g. 'Near the end')\"\n\
             }}\n\
           ]\n\
         }}", 
         language
    );

    // Call LLM for extraction
    let content = crate::services::universal_ai::UniversalAiService::generate_text(
        &enriched_transcript, 
        &instruction, 
        pool
    ).await?;

    // Validate if valid JSON and extract the array
    let clean_json = if content.trim().starts_with("```") {
        content
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string()
    } else {
        content.trim().to_string()
    };
    
    // Parse it and extract just the array
    let final_json = match serde_json::from_str::<serde_json::Value>(&clean_json) {
        Ok(val) => {
            if let Some(arr) = val.get("action_items") {
                serde_json::to_string(arr).unwrap_or_else(|_| "[]".to_string())
            } else {
                clean_json
            }
        },
        Err(_) => clean_json,
    };

    // Upsert into lecture_artifacts table
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    
    // We will save it as 'action_items' artifact_type
    sqlx::query!(
        "INSERT INTO lecture_artifacts (id, lecture_id, artifact_type, content_json, generated_at, model_used, status) \
         VALUES (?, ?, 'action_items', ?, ?, 'gemini-2.0-flash-lite', 'done') \
         ON CONFLICT(id) DO UPDATE SET status = 'done', content_json = excluded.content_json",
        id,
        lecture_id,
        final_json,
        now
    )
    .execute(pool)
    .await?;

    Ok(())
}
