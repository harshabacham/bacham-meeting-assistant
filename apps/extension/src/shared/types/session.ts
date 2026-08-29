/**
 * Session state machine states.
 *
 * Legal transitions:
 *   idle → requesting-permission
 *   idle → connecting
 *   requesting-permission → idle (permission denied)
 *   requesting-permission → connecting (permission granted)
 *   connecting → idle (connection failed, no session started)
 *   connecting → recording
 *   recording → paused
 *   recording → stopping
 *   paused → recording
 *   paused → stopping
 *   stopping → idle
 *   * → error
 *   error → idle (reset)
 */
export type SessionState =
  | 'idle'
  | 'requesting-permission'
  | 'connecting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'error';

/**
 * A single recording session.
 */
export interface Session {
  /** Unique identifier — UUID v4. */
  readonly id: string;
  /** ISO 8601 timestamp when recording started. */
  readonly startedAt: string;
  /** ISO 8601 timestamp when last paused (undefined if never paused). */
  readonly pausedAt?: string;
  /** ISO 8601 timestamp when the session ended (undefined if still running). */
  readonly endedAt?: string;
  /** Chrome tab ID being captured. */
  readonly tabId: number;
  /** Title of the captured tab at session start. */
  tabTitle: string;
  /** URL of the captured tab at session start. */
  tabUrl: string;
  /** User-supplied label (e.g. course name, lecture title). */
  courseLabel?: string;
  /** Mode used for this session's capture. */
  captureMode?: 'tab' | 'screen' | 'window' | 'walkthrough' | 'audio';
  /** Current state of this session. */
  state: SessionState;
  /** Accumulated paused duration in milliseconds. */
  pausedDurationMs: number;
  /** Error message if state is 'error'. */
  errorMessage?: string;
}

/**
 * Intent to start a new session, supplied by the user.
 */
export interface StartSessionIntent {
  courseLabel?: string;
  readonly captureAudio: boolean;
  readonly captureVideo: boolean;
  readonly includeMicrophone?: boolean;
  readonly captureMode?: 'tab' | 'screen' | 'window' | 'walkthrough' | 'audio';
  readonly streamId?: string;
  readonly streamHasAudio?: boolean;
  readonly screenshotIntervalMs?: number;
  readonly resolution?: 'auto' | '720p' | '1080p';
}

export interface LectureSummary {
  id: string;
  title: string;
  created_at: string;
  duration_ms: number;
}

export interface HistoryData {
  lectures: LectureSummary[];
}
