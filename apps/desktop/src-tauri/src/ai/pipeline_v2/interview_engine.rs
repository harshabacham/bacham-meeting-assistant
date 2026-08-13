use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InterviewInsight {
    pub question_detected: bool,
    pub question_text: Option<String>,
    pub suggested_answer: Option<String>,
    pub key_talking_points: Vec<String>,
    #[serde(default)]
    pub decision_detected: bool,
    pub decision_text: Option<String>,
    pub decision_reasoning: Option<String>,
}

pub struct InterviewEngine;

impl InterviewEngine {
    pub async fn process_transcript_segment(
        recent_context: &str,
        current_speaker: &str,
        platform: &str,
        pool: &sqlx::SqlitePool,
    ) -> AppResult<Option<InterviewInsight>> {
        // Remove the restriction on current_speaker != "You" so we can catch decisions proposed by the user too.
        // But for questions, we still only want questions asked BY the interviewer TO the user.

        let system_prompt = r#"You are an expert AI meeting copilot. You are listening to an ongoing conversation.
Analyze the provided transcript context in real-time to detect two distinct types of insights:
1. INTERVIEW QUESTION: Did the remote speaker just ask the local user a question? If so, generate a highly accurate suggested answer and key talking points.
2. GROUP DECISION: Did the group just reach a consensus, propose a decision, or assign a concrete action item? If so, extract the decision text.

If neither occurred, set both `questionDetected` and `decisionDetected` to false.
Respond ONLY in valid JSON matching this schema:
{
  "questionDetected": true/false,
  "questionText": "string",
  "suggestedAnswer": "string",
  "keyTalkingPoints": ["string", "string"],
  "decisionDetected": true/false,
  "decisionText": "string",
  "decisionReasoning": "string"
}
Raw JSON only, no markdown fencing."#;

        let user_prompt = format!(
            "Recent Conversation Context:\n{}\n\nInterviewer just said something. Analyze the context and provide interview insights in JSON format.",
            recent_context
        );

        let raw_res = crate::services::universal_ai::UniversalAiService::generate_text(&user_prompt, system_prompt, pool).await?;
        let clean_res = raw_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();

        if let Ok(insight) = serde_json::from_str::<InterviewInsight>(clean_res) {
            // Only return an insight if at least one of the two conditions is met
            if insight.question_detected || insight.decision_detected {
                // If it's a question, but the speaker is the local user ("You"), ignore the question part
                // so we don't prompt the user with answers to their own questions.
                let mut final_insight = insight.clone();
                if (current_speaker == "You" || platform == "native_mic") && final_insight.question_detected {
                    final_insight.question_detected = false;
                    final_insight.question_text = None;
                    final_insight.suggested_answer = None;
                    final_insight.key_talking_points = vec![];
                }

                if final_insight.question_detected || final_insight.decision_detected {
                    return Ok(Some(final_insight));
                }
            }
        }

        Ok(None)
    }
}
