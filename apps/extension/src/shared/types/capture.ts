export interface CaptureConfig {
  /** Whether to capture tab audio. */
  readonly audio: boolean;
  /** Whether to capture tab video. */
  readonly video: boolean;
  /**
   * Interval in milliseconds between automatic screenshots.
   * Minimum: 5000ms. Omit entirely to disable interval screenshots.
   */
  readonly screenshotIntervalMs?: number;
  /** Whether to capture the current tab or the entire screen. Defaults to 'tab' if omitted. */
  readonly captureMode?: 'tab' | 'screen' | 'walkthrough';
}

/** Detected lecture platform for metadata enrichment. */
export type DetectedPlatform =
  | 'zoom'
  | 'google-meet'
  | 'youtube'
  | 'teams'
  | 'unknown';

/** State of an active media capture. */
export interface CaptureState {
  /** Whether a MediaStream is actively capturing. */
  readonly isCapturing: boolean;
  /** Whether capture is paused (stream suspended). */
  readonly isPaused: boolean;
  /** Stream ID obtained from chrome.tabCapture.getMediaStreamId. */
  readonly streamId: string | null;
  /** Number of chunks produced so far in this session. */
  readonly chunkCount: number;
  /** Bytes captured in the current chunk. */
  readonly currentChunkBytes: number;
}
