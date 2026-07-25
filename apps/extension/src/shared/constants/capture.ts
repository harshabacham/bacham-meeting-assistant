/**
 * Capture-related constants.
 */

/** Minimum screenshot interval in milliseconds (5 seconds). */
export const MIN_SCREENSHOT_INTERVAL_MS = 5_000 as const;

/** Default screenshot interval when interval screenshots are enabled (30 seconds). */
export const DEFAULT_SCREENSHOT_INTERVAL_MS = 30_000 as const;

/**
 * Maximum duration of a single media chunk in milliseconds (30 seconds).
 * Chunks are collected and sent to the Desktop App at this cadence.
 */
export const CAPTURE_CHUNK_DURATION_MS = 60_000 as const;

/** Maximum size of a single chunk in bytes before it is forced to flush (~4 MB). */
export const CAPTURE_CHUNK_MAX_BYTES = 4_194_304; // 4 * 1024 * 1024

/** Default MediaRecorder MIME type for audio capture. */
export const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus' as const;

/** Default MediaRecorder MIME type for video capture. */
export const VIDEO_MIME_TYPE = 'video/webm;codecs=vp8,opus' as const;

/** MediaRecorder timeslice interval in milliseconds — how often `ondataavailable` fires. */
export const RECORDER_TIMESLICE_MS = 1_000 as const;
