/// FrameSelector — Smart frame deduplication and key-frame selection.
///
/// Uses a 64-bit mean perceptual hash (pHash) to compare incoming frames
/// against the last selected key frame. Frames that differ by more than
/// HASH_THRESHOLD bits are candidates for key-frame promotion; near-identical
/// consecutive frames collapse to a single key frame.
///
/// Token-cost tradeoff: only key frames are sent through the OCR/Gemini
/// pipeline. Raw screenshots are always stored for full-session playback.
use std::path::Path;
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

/// Hamming-distance threshold for key-frame selection.
/// 10 bits of 64 = ~15% visual difference. Tuned empirically.
const HASH_THRESHOLD: u32 = 10;

/// Perceptual hash: 8×8 mean hash → 64-bit integer (stored as hex string).
pub fn compute_phash(image_path: &Path) -> AppResult<u64> {
    use image::imageops::FilterType;

    let img = image::open(image_path)
        .map_err(|e| AppError::Internal(format!("Failed to open image for hashing: {e}")))?;

    // Resize to 8×8 grayscale
    let small = img.resize_exact(8, 8, FilterType::Lanczos3).into_luma8();
    let pixels: Vec<u8> = small.into_raw();

    let mean: f64 = pixels.iter().map(|&p| p as f64).sum::<f64>() / 64.0;
    let mut hash: u64 = 0;
    for (i, &p) in pixels.iter().enumerate() {
        if (p as f64) > mean {
            hash |= 1u64 << i;
        }
    }
    Ok(hash)
}

/// Hamming distance between two 64-bit hashes.
#[inline]
pub fn hamming(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

/// Detect why the frame changed based on available OCR text.
/// This is a lightweight heuristic; the full classification happens in the
/// intelligence pipeline via Gemini.
pub fn infer_change_reason(ocr_text: &str) -> &'static str {
    let lower = ocr_text.to_lowercase();
    if lower.contains("def ")
        || lower.contains("function ")
        || lower.contains("class ")
        || lower.contains("import ")
        || lower.contains("return ")
        || lower.contains("```")
    {
        return "code_appeared";
    }
    if lower.contains('∫')
        || lower.contains('∑')
        || lower.contains('∂')
        || lower.contains('√')
        || lower.contains("d/dx")
        || lower.contains("= 0")
        || lower.contains("theorem")
        || lower.contains("equation")
    {
        return "formula_appeared";
    }
    "slide_change"
}

pub struct FrameSelector;

impl FrameSelector {
    /// Evaluate whether an incoming screenshot should be promoted to a key frame.
    /// Updates the `screenshots` row in-place (is_key_frame, phash, change_reason).
    /// Returns `true` if this frame was selected.
    pub async fn evaluate(
        pool: &SqlitePool,
        screenshot_id: &str,
        image_path: &Path,
        lecture_id: &str,
    ) -> AppResult<bool> {
        // 1. Compute hash for the new frame
        let new_hash = match compute_phash(image_path) {
            Ok(h) => h,
            Err(e) => {
                eprintln!("[FrameSelector] hash failed for {}: {e}", image_path.display());
                // Can't hash → accept as key frame to not lose data
                return Self::promote(pool, screenshot_id, 0, "slide_change").await;
            }
        };

        // 2. Fetch the last selected key frame's phash for this lecture
        let last_hash_row = sqlx::query!(
            "SELECT phash FROM screenshots \
             WHERE lecture_id = ? AND is_key_frame = 1 AND phash IS NOT NULL \
             ORDER BY captured_at DESC LIMIT 1",
            lecture_id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let should_select = if let Some(row) = last_hash_row {
            if let Some(prev_hex) = row.phash {
                let prev_hash = u64::from_str_radix(prev_hex.trim_start_matches("0x"), 16)
                    .unwrap_or(0);
                hamming(new_hash, prev_hash) > HASH_THRESHOLD
            } else {
                true // previous key frame has no hash → select
            }
        } else {
            true // no previous key frame → always select first
        };

        if should_select {
            let reason = "slide_change"; // caller may override once OCR runs
            Self::promote(pool, screenshot_id, new_hash, reason).await
        } else {
            // Store the hash but don't promote
            let hex = format!("{new_hash:#018x}");
            sqlx::query!(
                "UPDATE screenshots SET phash = ?, is_key_frame = 0 WHERE id = ?",
                hex,
                screenshot_id
            )
            .execute(pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
            Ok(false)
        }
    }

    async fn promote(
        pool: &SqlitePool,
        screenshot_id: &str,
        hash: u64,
        reason: &str,
    ) -> AppResult<bool> {
        let hex = format!("{hash:#018x}");
        sqlx::query!(
            "UPDATE screenshots SET is_key_frame = 1, phash = ?, change_reason = ? WHERE id = ?",
            hex,
            reason,
            screenshot_id
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(true)
    }

    /// Update change_reason on a key frame once OCR text is available.
    pub async fn update_change_reason(
        pool: &SqlitePool,
        screenshot_id: &str,
        ocr_text: &str,
    ) -> AppResult<()> {
        let reason = infer_change_reason(ocr_text);
        sqlx::query!(
            "UPDATE screenshots SET change_reason = ? WHERE id = ? AND is_key_frame = 1",
            reason,
            screenshot_id
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_images_have_zero_distance() {
        // Construct two identical 8×8 mean hashes manually
        let hash = 0b1010101010101010u64;
        assert_eq!(hamming(hash, hash), 0);
    }

    #[test]
    fn totally_different_images_exceed_threshold() {
        let all_black: u64 = 0;
        let all_white: u64 = u64::MAX;
        assert!(hamming(all_black, all_white) > HASH_THRESHOLD);
    }

    #[test]
    fn code_detection() {
        assert_eq!(infer_change_reason("def my_function(x):"), "code_appeared");
        assert_eq!(infer_change_reason("import numpy as np"), "code_appeared");
    }

    #[test]
    fn formula_detection() {
        assert_eq!(infer_change_reason("∫ f(x) dx = F(x)"), "formula_appeared");
        assert_eq!(infer_change_reason("theorem: d/dx sin(x) = cos(x)"), "formula_appeared");
    }

    #[test]
    fn slide_change_default() {
        assert_eq!(infer_change_reason("Today we will discuss machine learning"), "slide_change");
    }
}
