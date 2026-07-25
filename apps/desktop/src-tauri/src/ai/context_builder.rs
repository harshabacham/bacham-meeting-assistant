/// ContextBuilder — Assembles a grounded multimodal payload for Gemini.
///
/// Every generation command (summary, notes, flashcards, quiz, chat) calls
/// this rather than assembling its own ad-hoc prompt. This prevents N
/// slightly-different grounding implementations from diverging over time.
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use base64::{Engine as _, engine::general_purpose::STANDARD};

/// A single transcript segment (may be the entire transcript or a chunk).
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptSegment {
    pub content: String,
    pub model_used: Option<String>,
}

/// A key frame extracted from the lecture screenshots.
#[derive(Serialize, Debug, Clone)]
pub struct KeyFrame {
    pub screenshot_id: String,
    pub captured_at: i64,
    pub change_reason: Option<String>,
    pub ocr_text: Option<String>,
    /// Base64-encoded PNG bytes for Gemini inline image parts.
    pub image_base64: Option<String>,
}

/// Assembled context payload for a lecture.
/// Passed to Gemini as multimodal content (text + image parts).
#[derive(Serialize, Debug, Clone)]
pub struct LectureContext {
    pub lecture_id: String,
    pub title: String,
    pub duration_ms: i64,
    pub course: Option<String>,
    pub transcript_segments: Vec<TranscriptSegment>,
    pub key_frames: Vec<KeyFrame>,
    /// Quick summary of what's available (for system prompt templating).
    pub has_transcript: bool,
    pub has_frames: bool,
    pub frame_count: usize,
}

impl LectureContext {
    /// True when there is no usable content to ground a response.
    pub fn is_empty(&self) -> bool {
        !self.has_transcript && !self.has_frames
    }
}

pub struct ContextBuilder;

impl ContextBuilder {
    /// Build the full context for a lecture, including image bytes for key frames.
    /// Pass `load_images = false` for text-only artifacts (summaries, notes)
    /// to avoid loading large image blobs unnecessarily.
    pub async fn build(
        pool: &SqlitePool,
        lecture_id: &str,
        load_images: bool,
    ) -> AppResult<LectureContext> {
        // 1. Lecture metadata
        let lecture_row = sqlx::query!(
            "SELECT title, duration_ms, course FROM lectures WHERE id = ?",
            lecture_id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or_else(|| AppError::Internal(format!("Lecture {lecture_id} not found")))?;

        // 2. Transcript segments
        let transcript_rows = sqlx::query!(
            "SELECT content, model_used FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC",
            lecture_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let transcript_segments: Vec<TranscriptSegment> = transcript_rows
            .into_iter()
            .map(|r| TranscriptSegment {
                content: r.content,
                model_used: r.model_used,
            })
            .collect();

        struct FrameRow {
            id: Option<String>,
            file_path: String,
            captured_at: i64,
            change_reason: Option<String>,
            ocr_text: Option<String>,
        }

        // 3. Key frames (only frames marked is_key_frame = 1)
        let mut frame_rows = sqlx::query_as!(
            FrameRow,
            "SELECT id, file_path, captured_at, change_reason, ocr_text \
             FROM screenshots \
             WHERE lecture_id = ? AND is_key_frame = 1 \
             ORDER BY captured_at ASC",
            lecture_id
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        // Fallback: If no keyframes found (e.g. old lecture), just fetch evenly spaced frames
        if frame_rows.is_empty() {
            let all_rows = sqlx::query_as!(
                FrameRow,
                "SELECT id, file_path, captured_at, change_reason, ocr_text \
                 FROM screenshots \
                 WHERE lecture_id = ? \
                 ORDER BY captured_at ASC",
                lecture_id
            )
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            if !all_rows.is_empty() {
                let step = (all_rows.len() / 15).max(1);
                frame_rows = all_rows.into_iter().step_by(step).take(15).collect();
            }
        }

        // Intelligently select up to 15 frames to include as base64 images to prevent quota exhaustion,
        // prioritizing those with the most OCR text or significant scene changes.
        let mut ranked_indices: Vec<(usize, usize)> = frame_rows.iter().enumerate().map(|(i, row)| {
            let score = row.ocr_text.as_ref().map(|t| t.len()).unwrap_or(0) 
                        + if row.change_reason.is_some() { 500 } else { 0 };
            (i, score)
        }).collect();
        ranked_indices.sort_by(|a, b| b.1.cmp(&a.1)); // descending
        
        let mut load_indices: std::collections::HashSet<usize> = ranked_indices.into_iter().take(5).map(|(i, _)| i).collect();
        if !load_images {
            load_indices.clear();
        }

        let mut key_frames = Vec::with_capacity(frame_rows.len());
        for (i, row) in frame_rows.into_iter().enumerate() {
            let image_base64 = if load_indices.contains(&i) {
                match tokio::fs::read(&row.file_path).await {
                    Ok(bytes) => Some(STANDARD.encode(&bytes)),
                    Err(e) => {
                        eprintln!("[ContextBuilder] Failed to read frame {}: {e}", row.file_path);
                        None
                    }
                }
            } else {
                None
            };

            key_frames.push(KeyFrame {
                screenshot_id: row.id.unwrap_or_default(),
                captured_at: row.captured_at,
                change_reason: row.change_reason,
                ocr_text: row.ocr_text,
                image_base64,
            });
        }

        let has_transcript = !transcript_segments.is_empty();
        let has_frames = !key_frames.is_empty();
        let frame_count = key_frames.len();

        Ok(LectureContext {
            lecture_id: lecture_id.to_string(),
            title: lecture_row.title,
            duration_ms: lecture_row.duration_ms,
            course: lecture_row.course,
            transcript_segments,
            key_frames,
            has_transcript,
            has_frames,
            frame_count,
        })
    }

    /// Build a compact text-only context for chat grounding.
    pub async fn build_text_only(pool: &SqlitePool, lecture_id: &str) -> AppResult<LectureContext> {
        Self::build(pool, lecture_id, false).await
    }

    /// Format the context as a text block for inclusion in prompts.
    pub fn format_text_context(ctx: &LectureContext) -> String {
        let mut parts = Vec::new();

        parts.push(format!("# Lecture: {}", ctx.title));
        if let Some(course) = &ctx.course {
            parts.push(format!("Course: {course}"));
        }
        let duration_min = ctx.duration_ms / 60_000;
        parts.push(format!("Duration: ~{duration_min} minutes"));
        parts.push(String::new());

        if ctx.has_transcript {
            parts.push("## Transcript".to_string());
            for seg in &ctx.transcript_segments {
                parts.push(seg.content.clone());
            }
            parts.push(String::new());
        }

        if ctx.has_frames {
            parts.push("## Visual Content (OCR from key frames)".to_string());
            for frame in &ctx.key_frames {
                if let Some(ocr) = &frame.ocr_text {
                    if !ocr.trim().is_empty() {
                        let reason = frame.change_reason.as_deref().unwrap_or("unknown");
                        parts.push(format!("[Frame at {}ms — {reason}]", frame.captured_at));
                        parts.push(ocr.clone());
                        parts.push(String::new());
                    }
                }
            }
        }

        parts.join("\n")
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_context_is_empty() {
        let ctx = LectureContext {
            lecture_id: "test".into(),
            title: "Test".into(),
            duration_ms: 0,
            course: None,
            transcript_segments: vec![],
            key_frames: vec![],
            has_transcript: false,
            has_frames: false,
            frame_count: 0,
        };
        assert!(ctx.is_empty());
    }

    #[test]
    fn context_with_transcript_not_empty() {
        let ctx = LectureContext {
            lecture_id: "test".into(),
            title: "Test".into(),
            duration_ms: 60_000,
            course: Some("CS101".into()),
            transcript_segments: vec![TranscriptSegment {
                content: "Hello world".into(),
                model_used: Some("gemini".into()),
            }],
            key_frames: vec![],
            has_transcript: true,
            has_frames: false,
            frame_count: 0,
        };
        assert!(!ctx.is_empty());
    }

    #[test]
    fn format_text_context_includes_title() {
        let ctx = LectureContext {
            lecture_id: "x".into(),
            title: "Calculus 101".into(),
            duration_ms: 3_600_000,
            course: Some("MATH201".into()),
            transcript_segments: vec![TranscriptSegment {
                content: "Derivatives are the rate of change.".into(),
                model_used: None,
            }],
            key_frames: vec![],
            has_transcript: true,
            has_frames: false,
            frame_count: 0,
        };
        let text = ContextBuilder::format_text_context(&ctx);
        assert!(text.contains("Calculus 101"));
        assert!(text.contains("MATH201"));
        assert!(text.contains("Derivatives are the rate of change."));
    }
}
